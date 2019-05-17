/**
 * Player requires a modern browser
 */


// TODO: midi import/export
//  use server for export http://grimmdude.com/MidiWriterJS/docs/index.html https://github.com/colxi/midi-parser-js/blob/master/src/midi-parser.js
    // TODO: midi file and jsf as data url

class SongStorage {
    constructor() {
    }

    /** Loading **/

    getRecentSongList() {
        return this.decodeForStorage(localStorage.getItem('song-recent-list') || '[]');
    }

    generateDefaultSong() {
        return {
            title: `Untitled (${new Date().toJSON().slice(0, 10).replace(/-/g, '/')})`,
            guid: this.generateGUID(),
            version: '0.0.1',
            root: 'root',
            created: new Date().getTime(),
            timeDivision: 96*4,
            beatsPerMinute: 120,
            beatsPerMeasure: 4,
            instruments: [{
                "url": "/synthesizer/synthesizer-instrument.element.js",
            }],
            instructions: {
                'root': [4,4]
            }
        }
    }


    encodeForStorage(json, replacer=null, space=null) {
        let encodedString = JSON.stringify(json, replacer, space);
        if(SongStorage.COMPRESSOR) {
            const compressedString = SongStorage.COMPRESSOR.compress(encodedString);
//             console.log(`Compression: ${compressedString.length} / ${encodedString.length} = ${Math.round((compressedString.length / encodedString.length)*100)/100}`);
            return compressedString;
        }
        return encodedString;
    }

    decodeForStorage(encodedString) {
        if(!encodedString)
            return null;
        if(SongStorage.COMPRESSOR)
            encodedString = SongStorage.COMPRESSOR.decompress(encodedString) || encodedString;
        return JSON.parse(encodedString);
    }

    saveSongToMemory(songData, songHistory) {
        // const song = this.getSongData();
        if(!songData.guid)
            songData.guid = this.generateGUID();
        let songRecentGUIDs = [];
        try {
            songRecentGUIDs = this.decodeForStorage(localStorage.getItem('song-recent-list') || '[]');
        } catch (e) {
            console.error(e);
        }
        songRecentGUIDs = songRecentGUIDs.filter((entry) => entry.guid !== songData.guid);
        songRecentGUIDs.unshift({guid: songData.guid, title: songData.title});
        localStorage.setItem('song-recent-list', this.encodeForStorage(songRecentGUIDs));


        localStorage.setItem('song:' + songData.guid, this.encodeForStorage(songData));
        localStorage.setItem('song-history:' + songData.guid, this.encodeForStorage(songHistory)); // History stored separately due to memory limits
        // this.querySelector('.song-menu').outerHTML = renderEditorMenuContent(this);
        // console.info("Song saved to memory: " + song.guid, song);
    }

    saveSongToFile(songData) {
        // const song = this.getSongData();
        const jsonString = JSON.stringify(songData, null, "\t");
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", songData.title);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }


    loadSongFromMemory(songGUID) {
        let songDataString = localStorage.getItem('song:' + songGUID);
        if(!songDataString)
            throw new Error("Song Data not found for guid: " + songGUID);
        let songData = this.decodeForStorage(songDataString);
        if(!songData)
            throw new Error("Invalid Song Data: " + songDataString);
        return songData;
        // console.info("Song loaded from memory: " + songGUID, songData, this.songHistory);
    }

    loadSongHistoryFromMemory(songGUID) {
        let songHistoryString = localStorage.getItem('song-history:' + songGUID);
        if(!songHistoryString)
            return null;
        return this.decodeForStorage(songHistoryString);
        // this.render();
        //this.gridSelect(null, 0);
        // console.info("Song loaded from memory: " + songGUID, songData, this.songHistory);
    }

    async loadMIDIFile(source) {

        if(typeof MidiParser === "undefined") {
            await new Promise((resolve, reject) => {
                const newScriptElm = document.createElement('script');
                newScriptElm.src = 'https://cdn.jsdelivr.net/gh/colxi/midi-parser-js/src/main.js';
                newScriptElm.onload = e => resolve();
                document.head.appendChild(newScriptElm);
            });
        }
        //
        const fileResult = await new Promise((resolve, reject) => {
            let reader = new FileReader();                                      // prepare the file Reader
            reader.readAsArrayBuffer(source.files[0]);                 // read the binary data
            reader.onload =  (e) => {
                resolve(e.target.result);
            };
        });

        // Move to renderer
        return MidiParser.parse(new Uint8Array(fileResult));
    }

    //
    // historyQueue(songHistory) {
    //     if(!Array.isArray(songHistory))
    //         songHistory = [];
    //     for(let i=0; i<songHistory.length; i++) {
    //         const historyAction = songHistory[i];
    //         this.status.history.currentStep++;
    //         historyAction.step = this.status.history.currentStep;
    //     }
    //     //
    //     // this.status.history.undoList.push(historyAction);
    //     // this.status.history.undoPosition = this.status.history.undoList.length-1;
    //
    //     if(this.webSocket && songHistory.length > 0) {
    //         console.info("Sending history actions: ", songHistory);
    //         this.webSocket
    //             .send(this.encodeForStorage({
    //                 type: 'history:entry',
    //                 songHistory: songHistory,
    //                 // guid: this.guid
    //             }))
    //     }
    // }
    //
    // historyUndo() {
    //
    // }
    //
    // historyRedo() {
    //
    // }
    // clearHistoryActions() {
    //     const actions = this.songHistory;
    //     this.songHistory = [];
    //     return actions;
    // }

    /** Modify Song Data **/

    generateGUID() { 
        var d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
            d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

}

// TODO: resolve compressor dependencies
// TODO: optionally use https://github.com/LZMA-JS/LZMA-JS (slower smaller)
SongStorage.COMPRESSOR = function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module&&(module.exports=LZString);


