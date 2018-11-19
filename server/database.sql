
SET foreign_key_checks = 0;

DROP TABLE IF EXISTS `song`;
CREATE TABLE `song` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_song_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `song_history`;
CREATE TABLE `song_history` (
  `step` int(11) NOT NULL,
  `action` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `song_id` int(11) DEFAULT NULL,
  KEY `fk_song_id_idx` (`song_id`),
  CONSTRAINT `fk_song_id` FOREIGN KEY (`song_id`) REFERENCES `song` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


SET foreign_key_checks = 1;