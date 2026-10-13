import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1791888218736 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` varchar(36) NOT NULL,
      \`username\` varchar(50) NOT NULL,
      \`email\` varchar(255) NOT NULL,
      \`passwordHash\` varchar(255) NOT NULL,
      \`avatarUrl\` varchar(255) DEFAULT NULL,
      \`bio\` text,
      \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updatedAt\` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`favoriteCharacterIds\` text,
      \`usernameUpdatedAt\` datetime DEFAULT NULL,
      \`nsfwFilter\` tinyint NOT NULL DEFAULT '0',
      \`birthDate\` date DEFAULT NULL,
      \`adultContentEnabled\` tinyint NOT NULL DEFAULT '0',
      \`adultRequestStatus\` varchar(20) NOT NULL DEFAULT 'none',
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`),
      UNIQUE KEY \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`groups\` (
      \`id\` varchar(36) NOT NULL,
      \`ownerId\` varchar(255) NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`description\` text,
      \`coverImageUrl\` varchar(255) DEFAULT NULL,
      \`isPublic\` tinyint NOT NULL DEFAULT '1',
      \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updatedAt\` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      KEY \`FK_4d8d8897aef1c049336d8dde13f\` (\`ownerId\`),
      CONSTRAINT \`FK_4d8d8897aef1c049336d8dde13f\` FOREIGN KEY (\`ownerId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`group_items\` (
      \`groupId\` varchar(255) NOT NULL,
      \`externalAnimeId\` varchar(255) NOT NULL,
      \`order\` int NOT NULL DEFAULT '0',
      \`note\` text,
      PRIMARY KEY (\`groupId\`,\`externalAnimeId\`),
      UNIQUE KEY \`IDX_b6a5d4aec5c2238344d77145f8\` (\`groupId\`,\`externalAnimeId\`),
      CONSTRAINT \`FK_05b6cde1280c0f1f20ffdd06490\` FOREIGN KEY (\`groupId\`) REFERENCES \`groups\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`reviews\` (
      \`id\` varchar(36) NOT NULL,
      \`userId\` varchar(255) NOT NULL,
      \`externalAnimeId\` varchar(255) NOT NULL,
      \`rating\` decimal(3,1) NOT NULL DEFAULT '0.0',
      \`comment\` text,
      \`watchedAt\` datetime NOT NULL,
      \`isRewatch\` tinyint NOT NULL DEFAULT '0',
      \`hasSpoilers\` tinyint NOT NULL DEFAULT '0',
      \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updatedAt\` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`IDX_fb65b5ad78607eb86eb12050cb\` (\`userId\`,\`externalAnimeId\`),
      CONSTRAINT \`FK_7ed5659e7139fc8bc039198cc1f\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`watchlist_entries\` (
      \`id\` varchar(36) NOT NULL,
      \`userId\` varchar(255) NOT NULL,
      \`externalAnimeId\` varchar(255) NOT NULL,
      \`watchedAt\` datetime DEFAULT NULL,
      \`addedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updatedAt\` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`status\` varchar(32) NOT NULL DEFAULT 'PLANNED',
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`IDX_efd4d3785c5d343dd41017be04\` (\`userId\`,\`externalAnimeId\`),
      KEY \`IDX_386a75287477441b6db2d410f8\` (\`userId\`,\`addedAt\`),
      CONSTRAINT \`FK_9d688f7e012dc17100d447c2ea8\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`watchlist_items\` (
      \`id\` varchar(36) NOT NULL,
      \`userId\` varchar(255) NOT NULL,
      \`externalAnimeId\` varchar(255) NOT NULL,
      \`addedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updatedAt\` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`status\` varchar(32) NOT NULL DEFAULT 'PLANNED',
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`IDX_6652752b4bad2a113d5279ade5\` (\`userId\`,\`externalAnimeId\`),
      KEY \`IDX_4fccd7b495bb16cbfdb06a8c1b\` (\`userId\`,\`addedAt\`),
      CONSTRAINT \`FK_1d44d0b2e52ecad244c712dfafa\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`follows\` (
      \`id\` varchar(36) NOT NULL,
      \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`followerId\` varchar(36) DEFAULT NULL,
      \`followingId\` varchar(36) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`IDX_105079775692df1f8799ed0fac\` (\`followerId\`,\`followingId\`),
      KEY \`FK_ef463dd9a2ce0d673350e36e0fb\` (\`followingId\`),
      CONSTRAINT \`FK_ef463dd9a2ce0d673350e36e0fb\` FOREIGN KEY (\`followingId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_fdb91868b03a2040db408a53331\` FOREIGN KEY (\`followerId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `follows`');
    await queryRunner.query('DROP TABLE IF EXISTS `watchlist_items`');
    await queryRunner.query('DROP TABLE IF EXISTS `watchlist_entries`');
    await queryRunner.query('DROP TABLE IF EXISTS `reviews`');
    await queryRunner.query('DROP TABLE IF EXISTS `group_items`');
    await queryRunner.query('DROP TABLE IF EXISTS `groups`');
    await queryRunner.query('DROP TABLE IF EXISTS `users`');
  }
}
