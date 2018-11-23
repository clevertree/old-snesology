DROP SCHEMA `snesology`;
CREATE SCHEMA IF NOT EXISTS `snesology`;
USE `snesology`;


SET foreign_key_checks = 0;

CREATE TABLE `song` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_song_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `song_history` (
  `song_id` int(11) DEFAULT NULL,
  `action` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `step` SMALLINT(11) NOT NULL,
  KEY `fk_song_id_idx` (`song_id`),
  UNIQUE KEY `in_song_id_step` (`step`,`song_id`),
  CONSTRAINT `fk_song_id` FOREIGN KEY (`song_id`) REFERENCES `song` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `song_content` (
  `song_id` INT NULL,
  `content` JSON NULL,
  `type` ENUM('live', 'published') NULL,
  `created` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` DATETIME NULL,
  `step` SMALLINT(11) NOT NULL,
  KEY `fk_song_content_song_id_idx` (`song_id` ASC),
  UNIQUE KEY `unique_song_content_type` (`song_id` ASC, `type` ASC),
  CONSTRAINT `fk_song_content_song_id`
  FOREIGN KEY (`song_id`)
  REFERENCES `song` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE);


SET foreign_key_checks = 1;