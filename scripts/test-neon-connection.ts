import { Client } from 'pg'

async function main() {
  const conn = process.argv[2] || process.env.DATABASE_URL
  if (!conn) {
    console.error('Connection string not provided. Use: npx ts-node scripts/test-neon-connection.ts "<connection_string>"')
    process.exit(1)
  }

  const client = new Client({
    connectionString: conn,
    // Neon uses TLS; allow self-signed certs if necessary for testing
    ssl: { rejectUnauthorized: false } as any
  })

  try {
    console.log('Connecting to:', conn.split('@')[1])
    await client.connect()
    const res = await client.query('SELECT version() as v, now() as now')
    console.log('Success:', res.rows[0])
  } catch (error) {
    console.error('Connection failed:')
    console.error(error)
    process.exitCode = 1
  } finally {
    try { await client.end() } catch {}
  }
}

main()
