import { config } from "./drizzle.config.ts";
import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg;

/**
 * Executes an SQL file in a PostgreSQL database.
 * @param {string} postgresUrl - The PostgreSQL connection URL.
 * @param {string} sqlFilePath - The path to the SQL file.
 * @returns {Promise<void>}
 */
async function executeSqlFile(postgresUrl: string, sqlFilePath: string) {
    const client = new Client({
        connectionString: postgresUrl,
    });

    try {
        // Read the SQL file
        const absolutePath = path.resolve(sqlFilePath);
        const sql = fs.readFileSync(absolutePath, 'utf8');

        // Connect to the database
        await client.connect();

        // Execute the SQL file
        await client.query(sql);

        console.log('SQL file executed successfully.');
    } catch (error) {
        console.error('Error executing SQL file:', error);
    } finally {
        // Close the database connection
        await client.end();
    }
}

executeSqlFile(config.dbCredentials.url, "./test/schema.sql");