import { useState, useMemo, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type DocSection = {
  heading: string
  body: string
  code?: string
  codeLanguage?: string
  tip?: string
  warning?: string
  note?: string
  params?: { name: string; type: string; required: boolean; description: string; anchorTarget?: string }[]
  returns?: string
  errors?: { code: string; cause: string; fix: string }[]
}

function Icon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'database':
      return (<svg {...common}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></svg>)
    case 'folder':
      return (<svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>)
    case 'workflow':
      return (<svg {...common}><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="12" r="2.5" /><path d="M8.2 7.2 15.8 10.8M8.2 16.8 15.8 13.2" /></svg>)
    case 'chart':
      return (<svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>)
    case 'file':
      return (<svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></svg>)
    case 'shield':
      return (<svg {...common}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>)
    case 'lightbulb':
      return (<svg {...common}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z" /></svg>)
    case 'alert':
      return (<svg {...common}><path d="M10.3 4.3 2.6 18a1 1 0 0 0 .9 1.5h17a1 1 0 0 0 .9-1.5L13.7 4.3a1.6 1.6 0 0 0-2.8 0z" /><path d="M12 9v4M12 17h.01" /></svg>)
    case 'info':
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>)
    case 'book':
      return (<svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M20 18H6.5A2.5 2.5 0 0 0 4 20.5" /></svg>)
    default:
      return null
  }
}

const DOCS: Record<string, {
  title: string
  icon: string
  color: string
  badge?: string
  sections: DocSection[]
}> = {
  '/sources': {
    title: 'Data Sources',
    icon: 'database',
    color: '#7c3aed',
    badge: 'Core',
    sections: [
      {
        heading: 'Overview',
        body: 'Data Sources is the ingestion layer of the platform. It accepts CSV files, live relational databases, cloud data warehouses, document stores, and Google Sheets. Every source registered here becomes available across Analysis, Data Catalog, and Pipeline Flow without re-uploading.',
        note: 'All credentials are stored in browser localStorage only. Nothing is transmitted to any third-party service.',
      },
      {
        heading: 'Supported source types',
        body: 'The platform supports seven source types out of the box:',
        params: [
          { name: 'CSV', type: 'File upload', required: false, description: 'Any UTF-8 encoded .csv file. Stored in browser memory for the session.', anchorTarget: 'csv-upload' },
          { name: 'Google Sheets', type: 'OAuth 2.0', required: false, description: 'Read live spreadsheet data via Google Drive API. Requires one-time OAuth consent.', anchorTarget: 'google-sheets' },
          { name: 'MySQL', type: 'TCP connection', required: false, description: 'Direct connection to any MySQL 5.7+ or 8.x server. Supports SSL/TLS.', anchorTarget: 'mysql' },
          { name: 'PostgreSQL', type: 'TCP connection', required: false, description: 'Direct connection to any PostgreSQL 12+ server. Supports SSL/TLS.', anchorTarget: 'postgresql' },
          { name: 'BigQuery', type: 'Service account', required: false, description: 'GCP service account key (JSON). Requires Data Viewer + Job User roles.', anchorTarget: 'bigquery' },
          { name: 'MongoDB', type: 'Connection URI', required: false, description: 'Standard mongodb:// or mongodb+srv:// URI. Documents are flattened to tabular CSV.', anchorTarget: 'mongodb' },
          { name: 'Data Catalog', type: 'Internal', required: false, description: 'Select any previously profiled dataset from the internal catalog.' },
          { name: 'Databricks', type: 'PAT token', required: false, description: 'Connect a Databricks SQL Warehouse using a Personal Access Token. Requires workspace host, HTTP path, catalog, and schema.', anchorTarget: 'databricks' },
          { name: 'AWS (RDS / S3 / Redshift / DynamoDB)', type: 'IAM access key', required: false, description: 'Connect AWS services using an IAM Access Key ID and Secret. Supports RDS MySQL, RDS PostgreSQL, Redshift, S3 CSV files, DynamoDB, and Cost Explorer.', anchorTarget: 'aws-rds-s3-redshift-dynamodb' },
          { name: 'GCS (Cloud Storage)', type: 'Service account', required: false, description: 'Read CSV files from a GCP Cloud Storage bucket using a service account JSON key.', anchorTarget: 'google-cloud-storage-gcs-' },
          { name: 'Cloud SQL', type: 'Public IP + credentials', required: false, description: 'Connect GCP Cloud SQL (PostgreSQL or MySQL) via its public IP. Requires Authorized Networks to include your IP.', anchorTarget: 'cloud-sql' },
          { name: 'REST API', type: 'Bearer / API key / No auth', required: false, description: 'Connect any REST API endpoint as a data source. Supports Bearer token, API key header, or unauthenticated endpoints. Multiple endpoints per connection.', anchorTarget: 'rest-api' },
          { name: 'Google Analytics 4', type: 'Service account', required: false, description: 'Connect a GA4 property via a GCP service account JSON key. Configure metrics and dimensions at connection time; date ranges are selected during analysis.', anchorTarget: 'google-analytics-4-ga4-' },
        ],
      },
      {
        heading: 'CSV upload',
        body: 'Drag any .csv file onto the drop zone on the Add New tab, or click to open the file browser. The file is parsed in the browser and held in memory. Once confirmed, the app navigates to Analysis and begins profiling automatically.',
        tip: 'Files never leave your machine — they are processed by your local backend server only.',
        code: '// Accepted format\ncontent-type: text/csv\nencoding: UTF-8\nmax recommended size: 500 MB',
        codeLanguage: 'bash',
      },
      {
        heading: 'Google Sheets',
        body: 'Click the Google Sheets tile on Add New. An OAuth 2.0 popup opens — sign in and grant read access (one-time per Google account). Your spreadsheets load from the Drive API. Select a spreadsheet, select a worksheet tab, and click Import. The sheet is downloaded as CSV and stored locally.',
        tip: 'If the OAuth popup is blocked, disable your browser\'s ad-blocker or popup blocker for localhost.',
        warning: 'Google Sheets connected as destinations are rate-limited to one write per 60 seconds by the backend to avoid Sheets API quota exhaustion.',
      },
      {
        heading: 'MySQL',
        body: 'Fill in the connection form with your host, port (default 3306), username, password, and database name. Click Test Connection — the backend executes SELECT 1 as a health check. On success, the full table list loads. Select one or more tables and click Add Source.',
        params: [
          { name: 'host', type: 'string', required: true, description: 'Hostname or IP address of the MySQL server.' },
          { name: 'port', type: 'number', required: true, description: 'TCP port. Default: 3306.' },
          { name: 'user', type: 'string', required: true, description: 'MySQL username.' },
          { name: 'password', type: 'string', required: true, description: 'MySQL password. Stored in localStorage, never transmitted to third parties.' },
          { name: 'database', type: 'string', required: true, description: 'Target database name.' },
          { name: 'ssl', type: 'boolean', required: false, description: 'Enable TLS. Required for cloud-hosted instances (RDS, PlanetScale, etc.).' },
        ],
        tip: 'For MySQL servers behind a VPN or corporate firewall with no public IP, use the Secure Tunneling agent instead of a direct connection.',
        errors: [
          { code: 'Error 1045', cause: 'Wrong username or password', fix: 'Verify credentials. Ensure the user has GRANT privileges on the target database.' },
          { code: 'Error 1049', cause: 'Database does not exist', fix: 'Check the database name. Run SHOW DATABASES; on the server to confirm.' },
          { code: 'ECONNREFUSED', cause: 'Server not reachable on the given port', fix: 'Confirm MySQL is running. Check firewall / security group rules for port 3306.' },
          { code: 'Timeout', cause: 'Host unreachable within 12 seconds', fix: 'Your IP may need whitelisting. Consider using the tunnel agent for private networks.' },
        ],
      },
      {
        heading: 'PostgreSQL',
        body: 'Same connection flow as MySQL. Default port is 5432. The backend uses asyncpg for async queries. SSL toggle enables TLS — required for Supabase, AWS RDS, Neon, and other managed providers.',
        params: [
          { name: 'host', type: 'string', required: true, description: 'Hostname or IP of the PostgreSQL server.' },
          { name: 'port', type: 'number', required: true, description: 'TCP port. Default: 5432.' },
          { name: 'user', type: 'string', required: true, description: 'PostgreSQL username.' },
          { name: 'password', type: 'string', required: true, description: 'PostgreSQL password.' },
          { name: 'database', type: 'string', required: true, description: 'Target database name.' },
          { name: 'ssl', type: 'boolean', required: false, description: 'Enable TLS encryption.' },
        ],
        note: 'Only tables in the public schema are listed. Views and materialized views are excluded from the table picker.',
      },
      {
        heading: 'BigQuery',
        body: 'BigQuery is Google\'s managed data warehouse. To connect, you need a service account key — a JSON file that lets this app read your BigQuery data securely.\n\nStep 1: Open the Google Cloud Console → IAM & Admin → Service Accounts (console.cloud.google.com/iam-admin/serviceaccounts). Click "Create Service Account", give it any name.\n\nStep 2: On the next screen, grant it two roles: "BigQuery Data Viewer" and "BigQuery Job User". Click Done.\n\nStep 3: Click the service account you just created → Keys tab → Add Key → Create new key → JSON. A .json file downloads to your computer.\n\nStep 4: Come back here, click the BigQuery tile, paste the entire contents of that JSON file into the key field, enter your Project ID (visible in the top bar of the console), and click Test Connection. Your datasets and tables will load — select the ones you want and click Add Source.',
        params: [
          { name: 'key_json', type: 'string (JSON)', required: true, description: 'Paste the full contents of the downloaded .json service account key file here.' },
          { name: 'project', type: 'string', required: true, description: 'Your GCP Project ID — visible in the top bar of console.cloud.google.com. This is the ID (e.g. my-project-123), not the display name.' },
          { name: 'dataset', type: 'string', required: true, description: 'The BigQuery dataset containing your tables. Loaded automatically after a successful connection.' },
        ],
        tip: 'The service account only needs two roles: BigQuery Data Viewer + BigQuery Job User. You can create a dedicated service account just for this tool with read-only access — no write permissions needed.',
        warning: 'BigQuery charges your GCP project for each query. This platform fetches up to 50,000 rows per table per run. Check your billing at console.cloud.google.com/billing before running large analyses.',
      },
      {
        heading: 'Google Cloud Storage (GCS)',
        body: 'GCS lets you connect CSV files stored in a Cloud Storage bucket directly as a source. You use the same service account approach as BigQuery.\n\nStep 1: Open console.cloud.google.com/iam-admin/serviceaccounts and create a service account.\n\nStep 2: Grant it the role "Storage Object Viewer" on the bucket you want to read.\n\nStep 3: Create a JSON key (Keys tab → Add Key → JSON) and download it.\n\nStep 4: Click the Cloud Storage tile in Data Sources, paste the JSON key, enter your Project ID and bucket name, optionally set a folder prefix, and click Test Connection. All CSV files in that bucket/folder will load for you to select.',
        tip: 'You can restrict the service account to a specific bucket by granting the role at the bucket level in console.cloud.google.com/storage rather than at the project level.',
        note: 'Only .csv files in the bucket are shown. Other file types (Parquet, JSON, Avro) are not currently supported.',
      },
      {
        heading: 'Cloud SQL',
        body: 'Cloud SQL is Google\'s managed MySQL and PostgreSQL service. It connects the same way as a regular MySQL or PostgreSQL server — using a host, port, username, and password.\n\nStep 1: Open console.cloud.google.com/sql and open your Cloud SQL instance.\n\nStep 2: Go to Connections → Networking and enable a Public IP if you don\'t already have one. Add your current IP address to the Authorized Networks list.\n\nStep 3: Note the Public IP address shown on the instance overview page.\n\nStep 4: Click the Cloud SQL tile in Data Sources, enter the Public IP as the host, your database username and password, the database name, and click Test Connection.',
        tip: 'If you do not want to expose a public IP, you can use the Secure Tunneling agent instead — run agent.py on a machine inside your GCP VPC that can reach the Cloud SQL private IP.',
        warning: 'Always add only your specific IP to the Authorized Networks list, not 0.0.0.0/0 (all IPs). Leaving Cloud SQL open to all IPs is a security risk.',
      },
      {
        heading: 'MongoDB',
        body: 'Paste your full connection URI and target database name. The backend connects via Motor (async MongoDB driver), runs a ping command as a health check, and lists all collections in the database. Select collections to connect. Documents are flattened — nested objects are serialized to JSON strings for tabular compatibility.',
        params: [
          { name: 'uri', type: 'string', required: true, description: 'Full MongoDB connection URI. Supports mongodb:// and mongodb+srv:// schemes.' },
          { name: 'database', type: 'string', required: true, description: 'Target database name.' },
        ],
        code: '// Example URI formats\nmongodb://username:password@host:27017/\nmongodb+srv://username:password@cluster.mongodb.net/',
        codeLanguage: 'bash',
        note: 'Nested arrays and objects in documents are serialized as JSON strings in the CSV output. Deeply nested schemas may reduce analysis accuracy.',
      },
      {
        heading: 'AWS — RDS, S3, Redshift, DynamoDB',
        body: 'AWS sources connect using IAM access keys — a key ID and secret that identify a specific IAM user. This tool never stores these on any server; they stay in your browser only.\n\nStep 1: Open the AWS Console → IAM → Users (console.aws.amazon.com/iam/home#/users). Create a new user or select an existing one.\n\nStep 2: Attach the permissions your source needs:\n  • RDS MySQL / PostgreSQL: AmazonRDSReadOnlyAccess\n  • Amazon S3: AmazonS3ReadOnlyAccess\n  • Redshift: AmazonRedshiftReadOnlyAccess\n  • DynamoDB: AmazonDynamoDBReadOnlyAccess\n  • Cost Explorer: attach a custom policy with ce:GetCostAndUsage\n\nStep 3: Go to the user\'s Security credentials tab → Create access key. Copy the Access Key ID and Secret Access Key.\n\nStep 4: Click the AWS tile in Data Sources, select your service (RDS MySQL, RDS PostgreSQL, S3, Redshift, DynamoDB, or Cost Explorer), enter your Access Key ID and Secret, fill in the service-specific fields (host/port for RDS, bucket name for S3, table name for DynamoDB), and click Test Connection.',
        params: [
          { name: 'Access Key ID', type: 'string', required: true, description: 'From IAM → Users → Security credentials → Create access key.' },
          { name: 'Secret Access Key', type: 'string', required: true, description: 'Shown once when you create the access key. Copy it immediately.' },
          { name: 'Region', type: 'string', required: true, description: 'AWS region where your resource lives, e.g. us-east-1. Find it in the top-right of the AWS console.' },
          { name: 'Service', type: 'enum', required: true, description: 'Choose: RDS MySQL, RDS PostgreSQL, S3, Redshift, DynamoDB, or Cost Explorer.' },
          { name: 'Host (RDS/Redshift)', type: 'string', required: false, description: 'The endpoint URL from the RDS or Redshift instance page in the AWS console.' },
          { name: 'Bucket (S3)', type: 'string', required: false, description: 'The S3 bucket name. Find it at console.aws.amazon.com/s3.' },
          { name: 'Table (DynamoDB)', type: 'string', required: false, description: 'The DynamoDB table name. Find it at console.aws.amazon.com/dynamodb.' },
        ],
        tip: 'Create a dedicated IAM user with read-only permissions just for this tool. Never use your root account credentials or a user with write access.',
        warning: 'For RDS and Redshift, the instance must be publicly accessible or you must use the Secure Tunneling agent. Enable "Publicly accessible" in the instance settings and add your IP to the security group inbound rules.',
      },
      {
        heading: 'AWS Cost Explorer',
        body: 'Cost Explorer pulls your AWS billing and usage data as a dataset you can analyze and clean.\n\nStep 1: Make sure Cost Explorer is enabled for your account — go to console.aws.amazon.com/cost-management/home and click "Enable Cost Explorer" if you see that option.\n\nStep 2: Create an IAM user with a policy that includes ce:GetCostAndUsage (or attach the AWS managed policy AWSBillingReadOnlyAccess).\n\nStep 3: Generate an access key for that user (IAM → Users → Security credentials → Create access key).\n\nStep 4: Click the Cost Explorer tile, enter your Access Key ID and Secret, choose a date range, granularity (Daily or Monthly), and grouping (by Service, Region, or Usage Type), then click Fetch Cost Data. The data loads as a CSV source ready for analysis.',
        tip: 'Cost Explorer data is available from the date you enabled it. Historical data before that date is not available.',
        note: 'Cost Explorer API calls have a small cost ($0.01 per 1,000 requests). Each fetch in this tool counts as one request.',
      },
      

      
      {
        heading: 'Databricks',
        body: 'Databricks connects via a SQL Warehouse using a Personal Access Token (PAT). The platform calls your Databricks workspace REST API to list tables and fetch data as CSV for analysis and pipeline runs.\n\nStep 1: Workspace Host — the URL of your Databricks workspace, e.g. adb-1234567890123456.7.azuredatabricks.net (Azure) or dbc-xxxxx.cloud.databricks.com (AWS). Find it in the browser address bar when you are logged in.\n\nStep 2: HTTP Path — go to SQL Warehouses → click your warehouse → Connection Details tab → copy the HTTP Path (e.g. /sql/1.0/warehouses/xxxxxxxxxx).\n\nStep 3: Personal Access Token — go to your user icon → Settings → Developer → Access Tokens → Generate new token. Copy it immediately — it is shown only once.\n\nStep 4: Click the Databricks tile in Data Sources, fill in the workspace host, HTTP path, token, catalog, and schema, then click Test Connection. Select tables and click Add Source.',
        params: [
          { name: 'host', type: 'string', required: true, description: 'Workspace hostname without https://, e.g. adb-1234.7.azuredatabricks.net' },
          { name: 'httpPath', type: 'string', required: true, description: 'HTTP path from SQL Warehouse Connection Details, e.g. /sql/1.0/warehouses/xxxxxxxxxx' },
          { name: 'token', type: 'string', required: true, description: 'Personal Access Token generated in Databricks Settings → Developer → Access Tokens.' },
          { name: 'catalog', type: 'string', required: false, description: 'Unity Catalog name. Use hive_metastore for legacy metastore workspaces. Default: hive_metastore.' },
          { name: 'schema', type: 'string', required: false, description: 'Schema (database) name within the catalog. Default: default.' },
        ],
        tip: 'Set a long expiry (e.g. 90 days) on the PAT so pipelines do not break unexpectedly. Rotate and update the token in Data Sources before it expires.',
        warning: 'The SQL Warehouse must be running (not terminated) when you test the connection and when pipelines execute. Databricks auto-terminates idle warehouses after a configurable timeout — start the warehouse manually before running a pipeline if it has been idle.',
        errors: [
          { code: '403 Forbidden', cause: 'PAT token is invalid, expired, or lacks permissions.', fix: 'Generate a new token in Databricks Settings → Developer → Access Tokens. Ensure it has CAN USE permission on the SQL Warehouse.' },
          { code: 'SQL Warehouse terminated', cause: 'The warehouse auto-terminated due to inactivity.', fix: 'Start the warehouse from the Databricks SQL Warehouses page before connecting or running pipelines.' },
          { code: 'Table not found', cause: 'The catalog or schema name is wrong, or the table does not exist.', fix: 'Verify catalog and schema in the Databricks Data Explorer. Use hive_metastore if Unity Catalog is not enabled.' },
          { code: 'ECONNREFUSED / timeout', cause: 'Backend cannot reach the Databricks workspace host.', fix: 'Check that the workspace host is correct (no https:// prefix). Confirm the backend has outbound internet access to azuredatabricks.net or cloud.databricks.com.' },
        ],
      },
      {
        heading: 'REST API',
        body: 'Connect any REST API as a data source. Enter the base URL, optional auth credentials, a test path for the health check, and one or more endpoint paths (one per line). The backend tests the health path first, then probes each endpoint and shows its HTTP status. Only endpoints that return a successful response are selectable.\n\nSupported auth methods: Bearer token (set Auth Header to Authorization and Auth Prefix to Bearer), API key in a custom header (change the Auth Header name), or no auth at all (leave the API Key field empty).',
        params: [
          { name: 'base_url', type: 'string', required: true, description: 'Base URL of the API, e.g. https://api.example.com. Do not include trailing slash.' },
          { name: 'auth_header', type: 'string', required: false, description: 'HTTP header name for authentication. Default: Authorization.' },
          { name: 'auth_prefix', type: 'string', required: false, description: 'Prefix before the token value. Default: Bearer. Leave empty for raw key headers.' },
          { name: 'api_key', type: 'string', required: false, description: 'API key or token value. Combined with auth_prefix as "{prefix} {key}" in the header.' },
          { name: 'test_path', type: 'string', required: false, description: 'Path used for the health check request, e.g. /health or /api/v1/status. Default: /.' },
          { name: 'endpoints', type: 'string (one per line)', required: true, description: 'API endpoint paths to connect as sources, e.g. /api/v1/users. Each becomes a separate source entry.' },
          { name: 'verify_ssl', type: 'boolean', required: false, description: 'Enable SSL certificate verification. Disable only for self-signed certificates on private networks.' },
        ],
        tip: 'For APIs that return paginated data, connect the base list endpoint (e.g. /api/v1/orders). The backend fetches the first page and uses it as the data sample for analysis.',
        note: 'Source names are stored as rest:hostname/endpoint (e.g. rest:api.example.com/api/v1/users). Credentials stay in your browser localStorage only — never sent to any third-party server.',
        errors: [
          { code: 'Health check failed', cause: 'The test path returned a non-2xx status or the host is unreachable.', fix: 'Verify the base URL and test path. Confirm the API is publicly accessible or the backend can reach it. Try /api or / if /health does not exist.' },
          { code: 'SSL verification failed', cause: 'The API uses a self-signed or expired certificate.', fix: 'Toggle "Verify SSL" off in the connection form. Only do this for internal or development APIs.' },
          { code: 'Endpoint 401 / 403', cause: 'Authentication header is missing or incorrect.', fix: 'Check the Auth Header name, Auth Prefix, and API Key value. Some APIs use X-API-Key as the header name with no prefix.' },
        ],
      },
      {
        heading: 'Google Analytics 4 (GA4)',
        body: 'Connect a GA4 property using a GCP service account. Unlike some analytics integrations, no date range is set during connection — you configure metrics and dimensions once, and the date range is selected freely during analysis, just like Looker Studio.\n\nStep 1: Open console.cloud.google.com/iam-admin/serviceaccounts. Create a service account and generate a JSON key (Keys tab → Add Key → JSON). Download the file.\n\nStep 2: In your GA4 property, go to Admin → Property Access Management → Add users. Enter the service account email address (found in the JSON file under client_email) and assign the Viewer role.\n\nStep 3: Find your GA4 Property ID: Admin → Property Settings → Property ID (a numeric ID like 123456789).\n\nStep 4: Click the Google Analytics 4 tile in Data Sources, paste the JSON key, enter the Property ID, set your desired metrics and dimensions, then click Test Connection. Click Add Source to save.',
        params: [
          { name: 'propertyId', type: 'string', required: true, description: 'Numeric GA4 Property ID from Admin → Property Settings. Format: 123456789.' },
          { name: 'keyJson', type: 'string (JSON)', required: true, description: 'Full contents of the GCP service account JSON key file.' },
          { name: 'metrics', type: 'string (comma-separated)', required: true, description: 'GA4 metrics to fetch, e.g. sessions,activeUsers,newUsers,screenPageViews,bounceRate,averageSessionDuration.' },
          { name: 'dimensions', type: 'string (comma-separated)', required: true, description: 'GA4 dimensions to fetch, e.g. date,sessionDefaultChannelGroup,country,deviceCategory.' },
        ],
        tip: 'Common metrics: sessions, activeUsers, newUsers, screenPageViews, bounceRate, averageSessionDuration, conversions. Common dimensions: date, country, city, deviceCategory, sessionDefaultChannelGroup, pagePath, browser.',
        note: 'Date ranges are not set during connection. The connection stores a wide default window (365 days) internally; the actual date range you want to analyze is selected in the Analysis view after connection — exactly like Looker Studio GA4 connectors.',
        warning: 'The service account must be granted Viewer access inside the GA4 property itself (not just in GCP IAM). Without this step the health check will fail with a permission error even if the JSON key is valid.',
        errors: [
          { code: 'Permission denied', cause: 'The service account was not added to the GA4 property as a Viewer.', fix: 'In GA4: Admin → Property Access Management → Add users → enter the service account email → assign Viewer role.' },
          { code: 'Property not found', cause: 'The Property ID is wrong or the service account cannot access it.', fix: 'Confirm the Property ID in GA4 Admin → Property Settings. Make sure you are using the numeric ID, not the Measurement ID (G-XXXXXX).' },
          { code: 'Invalid key JSON', cause: 'The pasted service account key is malformed or truncated.', fix: 'Re-download the JSON key from GCP Console → IAM → Service Accounts → Keys tab → Add Key → JSON. Paste the entire file contents.' },
        ],
      },
      {
        heading: 'Removing a source',
        body: 'Click the ✕ button on any source card in the Connected Sources tab. The source is removed from the app state immediately. For MySQL, PostgreSQL, BigQuery, and MongoDB sources, the saved connection record is also deleted from localStorage — the connection will not attempt to reconnect on the next page load.',
        warning: 'Removing a source does not delete any data from the underlying database. It only removes the connection configuration from the browser.',
      },
      {
        heading: 'Data governance: retention & erasure',
        body: 'Every connected source (any source with a saved backend connection — MySQL, PostgreSQL, MongoDB, BigQuery, AWS, GCS, Cloud SQL, or Databricks) exposes a ⚙ governance panel. Click the ⚙ button on a source card to expand it. Plain CSV uploads do not have a backend connection and show an explanatory note instead of controls.',
        params: [
          { name: 'Retention (days)', type: 'number | null', required: false, description: 'When set, the server automatically drops the entire table, collection, or file this connection points to once it has gone untouched for that many days. Leave empty to disable.' },
          { name: 'Erase Now', type: 'action', required: false, description: 'Immediately and permanently deletes all data this connection points to — the entire table/collection/file, not row-level filtering. Used for DPDP/GDPR right-to-erasure requests.' },
        ],
        warning: 'Both retention auto-purge and manual erasure are irreversible whole-object deletions (DROP TABLE / collection.drop() / file delete) — not row-level filtering by data subject. There is no undo.',
        note: 'Every retention change and erasure (automatic or manual) is recorded in Audit Logs under the connection.retention_updated, connection.retention_erased, and connection.erased actions, including which user or the scheduler triggered it.',
      },
      {
        heading: 'Best practices',
        body: 'Follow these guidelines for reliable source management:',
        params: [
          { name: 'Use read-only credentials', type: 'Security', required: false, description: 'Create a dedicated read-only database user for this platform. Never use root or admin credentials.' },
          { name: 'Enable SSL for remote databases', type: 'Security', required: false, description: 'Always enable the SSL toggle for any database not running on localhost.' },
          { name: 'Limit table selection', type: 'Performance', required: false, description: 'Select only the tables you need. Each selected table becomes a separate source entry.' },
          { name: 'Use the tunnel for private networks', type: 'Connectivity', required: false, description: 'Run agent.py on a machine inside the VPN instead of opening firewall ports.' },
        ],
      },
    ],
  },
  '/catalog': {
    title: 'Data Catalog',
    icon: 'folder',
    color: '#3b82f6',
    badge: 'Governance',
    sections: [
      {
        heading: 'Overview',
        body: 'The Data Catalog is the metadata and governance layer of the platform. Every source registered in Data Sources automatically appears here with a business description, classification tags, data owner attribution, and profiling status. The catalog is read-only — structural changes are made in Data Sources.',
        note: 'The catalog updates in real time as sources are added or removed. No manual refresh is needed.',
      },
      {
        heading: 'Catalog card anatomy',
        body: 'Each dataset card surfaces the following metadata fields:',
        params: [
          { name: 'Name', type: 'string', required: true, description: 'Source file or table name as registered in Data Sources.' },
          { name: 'Business description', type: 'string', required: false, description: 'Auto-generated description derived from the source name and upstream system.' },
          { name: 'Tags', type: 'string[]', required: false, description: 'Governance classification tags. Default set: Sensitive, MyGov, Finance, Internal.', anchorTarget: 'governance-tags' },
          { name: 'Profiling status', type: 'enum', required: false, description: '"Profiled" (analysis has run) or "Needs Profiling" (no analysis result exists).', anchorTarget: 'governance-tags' },
          { name: 'Row count', type: 'number', required: false, description: 'Populated after a successful Analysis run. Shows — until then.' },
          { name: 'Column count', type: 'number', required: false, description: 'Populated after a successful Analysis run. Shows — until then.' },
          { name: 'Data Owner', type: 'string', required: false, description: 'Currently hardcoded to "Local User". Editable in a future release.' },
          { name: 'Last Updated', type: 'date', required: false, description: 'The date the source was added to the platform.' },
        ],
      },
      {
        heading: 'Search and filter',
        body: 'The search bar performs a full-text match across four fields simultaneously: source name, business description, tags, and data owner. The Owner filter and Date filter add further constraints. All active filters combine with AND logic — a result must satisfy every active filter to appear.',
        tip: 'Search is case-insensitive and supports partial matches. Searching "fin" will match sources tagged "Finance".',
      },
      {
        heading: 'Governance tags',
        body: 'Every source receives the default governance tag set on registration. Tags communicate data sensitivity, regulatory scope, and business domain.',
        params: [
          { name: 'Sensitive', type: 'Risk', required: false, description: 'Contains PII or confidential business data. Handle with restricted access.' },
          { name: 'MyGov', type: 'Regulatory', required: false, description: 'Data linked to government scheme identifiers or PFMS/NIC systems.' },
          { name: 'Finance', type: 'Domain', required: false, description: 'Contains monetary values, disbursements, or fiscal year data.' },
          { name: 'Internal', type: 'Access', required: false, description: 'For internal use only. Not approved for external sharing.' },
          { name: 'Profiled', type: 'Status', required: false, description: 'Analysis has been run. Row count and column count are populated.', anchorTarget: 'running-the-profiler' },
          { name: 'Needs Profiling', type: 'Status', required: false, description: 'No analysis result exists. Click Run Profiler to generate metadata.', anchorTarget: 'running-the-profiler' },
        ],
      },
      {
        heading: 'Data Dictionary',
        body: 'Click "View Dictionary" on any catalog card to open the column-level data dictionary modal. The dictionary lists all standard columns with their name, data type, a plain-English business definition, and a Sensitive/PII flag.',
        params: [
          { name: 'Column Name', type: 'string', required: true, description: 'Exact column name as it appears in the dataset.' },
          { name: 'Type', type: 'enum', required: true, description: 'Data type: Integer, Float, String, Date, Boolean.' },
          { name: 'Definition', type: 'string', required: true, description: 'Plain-English description of what the column represents.' },
          { name: 'Sensitive', type: 'boolean', required: false, description: 'Whether this column is flagged as containing PII. Pre-populated by the automatic detector; click the pill to override manually.', anchorTarget: 'pii-detection' },
        ],
        note: 'Column definitions are maintained by the Data Governance team. Submit change requests through your internal governance process.',
      },
      {
        heading: 'PII detection',
        body: 'Every Analysis run scans column names and a sample of values for common PII patterns — PAN, Aadhaar, GSTIN, email addresses, and phone numbers — and flags any column that matches with reasonable confidence. Detected columns are automatically pre-checked as "Sensitive" in the Data Dictionary the next time you open it.',
        params: [
          { name: 'Detection basis', type: 'name + value pattern', required: false, description: 'A column is flagged either because its name matches a known PII term (e.g. "email", "pan_number") or because a sample of its values matches a regex pattern for PAN/Aadhaar/GSTIN/email/phone with high confidence.' },
          { name: 'Manual override', type: 'toggle', required: false, description: 'Click the Sensitive pill in the Data Dictionary to flag or unflag a column by hand. A manual choice always takes precedence over the automatic detection and will not be silently re-flagged on the next analysis.' },
        ],
        tip: 'Detection is best-effort and pattern-based — always review the Data Dictionary after connecting a new source rather than relying on auto-detection alone, especially for columns using non-standard names.',
        note: 'PII-flagged columns are automatically masked in the Analysis Preview and Columns tabs. See the Analysis documentation for how masking works.',
      },
      {
        heading: 'Running the profiler',
        body: 'Click "Run Profiler →" on any catalog card. The platform sets that source as the active source and navigates to Analysis, where a full profiling run starts automatically. After the run completes, row count, column count, and profiling status update on the catalog card.',
        tip: 'Profile all sources immediately after connecting them. The catalog is most useful when every card shows real row and column counts.',
      },
      {
        heading: 'Best practices',
        body: 'Recommended practices for maintaining a healthy catalog:',
        params: [
          { name: 'Profile on first connect', type: 'Workflow', required: false, description: 'Run the profiler immediately after adding a new source so metadata is always current.' },
          { name: 'Use search before browsing', type: 'Efficiency', required: false, description: 'The search bar is faster than scrolling when you have more than ten sources.' },
          { name: 'Review Needs Profiling badges', type: 'Governance', required: false, description: 'Unprofiled sources cannot show row counts or quality scores. Keep the catalog fully profiled.' },
        ],
      },
    ],
  },
  '/flow': {
    title: 'Pipeline Flow',
    icon: 'workflow',
    color: '#7c3aed',
    badge: 'Automation',
    sections: [
      {
        heading: 'Overview',
        body: 'Pipeline Flow is the orchestration engine. It lets you chain data cleaning transformations between a source and a destination, persist the pipeline with a name and schedule, and monitor every execution with full step-level logs and row-level metrics.',
      },
      {
        heading: 'Pipeline architecture',
        body: 'A pipeline consists of four components: a source dataset, one or more ordered transformation steps, a destination output, and an optional execution schedule. The backend applies each transformation sequentially and writes the result to the destination.',
        params: [
          { name: 'Source', type: 'DataSource', required: true, description: 'Any source registered in Data Sources. Supports CSV, Google Sheets, MySQL, PostgreSQL, BigQuery, and MongoDB.' },
          { name: 'Transformations', type: 'Transformation[]', required: true, description: 'Ordered list of cleaning steps applied left-to-right.', anchorTarget: 'available-transformations' },
          { name: 'Destination', type: 'string | DBConnection', required: true, description: 'Output CSV filename, or a connected database table for MySQL/PostgreSQL/BigQuery/MongoDB/Google Sheets.', anchorTarget: 'database-destinations' },
          { name: 'Write mode', type: 'replace | append', required: true, description: 'replace: overwrites the destination on every run. append: merges new rows onto existing data.', anchorTarget: 'write-modes' },
          { name: 'Schedule', type: 'CronExpression | null', required: false, description: 'Optional cron-based execution schedule. Runs in the browser tab while it is open.', anchorTarget: 'scheduling' },
        ],
      },
      {
        heading: 'Available transformations',
        body: 'Eight transformation types are available. Steps are applied in the order they appear in the pipeline diagram.',
        params: [
          { name: 'Remove Duplicates', type: 'Deduplication', required: false, description: 'Drops identical rows using pandas drop_duplicates(). Recommended as the first step.' },
          { name: 'Fill Missing', type: 'Imputation', required: false, description: 'Fills null values with column median (numeric) or mode (categorical).' },
          { name: 'Standardize Text', type: 'Normalization', required: false, description: 'Applies lowercase and strip() to all string columns.' },
          { name: 'Cap Outliers', type: 'Outlier handling', required: false, description: 'Clips values beyond ±3.5 MAD using the Modified Z-Score method.' },
          { name: 'Remove Empty Rows', type: 'Filtering', required: false, description: 'Drops rows where every column is null.' },
          { name: 'Fix Dates', type: 'Type coercion', required: false, description: 'Parses and standardizes date columns to ISO 8601 format (YYYY-MM-DD).' },
          { name: 'Clean with AI', type: 'Composite', required: false, description: 'Applies all standard transforms in a single step using the backend AI clean endpoint.', anchorTarget: 'ai-custom-rule' },
          { name: 'AI Custom Rule', type: 'Natural language', required: false, description: 'Describe a rule in plain English. Claude generates a label and the backend applies it.', anchorTarget: 'ai-custom-rule' },
        ],
        tip: 'Recommended step order: Remove Duplicates → Remove Empty Rows → Fill Missing → Cap Outliers → Standardize Text → Fix Dates.',
      },
      {
        heading: 'Write modes',
        body: 'Each pipeline run uses one of two write modes that control how output is written to the destination.',
        params: [
          { name: 'Replace', type: 'Default', required: false, description: 'The destination is fully overwritten on every run. Previous data is not preserved. Use for idempotent daily refreshes.', anchorTarget: 'pipeline-run-logs' },
          { name: 'Append', type: 'Incremental', required: false, description: 'Cleaned rows from the current run are merged onto existing destination data. If Remove Duplicates is active, deduplication runs across the combined dataset after append.', anchorTarget: 'pipeline-run-logs' },
        ],
        warning: 'Append mode with no deduplication step will accumulate duplicate rows across runs if the same source data is processed multiple times.',
      },
      {
        heading: 'Scheduling',
        body: 'Pipelines can be scheduled to run automatically. Two scheduling modes are available.',
        params: [
          { name: 'Frequency', type: 'Interval', required: false, description: 'Run every N minutes, hours, days, or weeks. Options: 5m, 15m, 30m, 1h, 6h, 12h, Daily, Weekly, Custom (ms interval + cron expression).', anchorTarget: 'pipeline-run-logs' },
          { name: 'Run at time', type: 'Daily fixed', required: false, description: 'Run at a specific clock time every day. Accepts HH:MM in any selectable timezone.', anchorTarget: 'pipeline-run-logs' },
          { name: 'Start date', type: 'date', required: false, description: 'Optional. The pipeline will not execute before this date.' },
          { name: 'Timezone', type: 'string', required: false, description: 'IANA timezone string. Applied to both Frequency and Run at time modes.' },
        ],
        warning: 'Schedules run inside the browser tab using setInterval. If the tab is closed or the computer sleeps, scheduled runs are skipped. For persistent scheduling, use PM2 or a server cron job to call the backend API directly.',
        code: '# Run backend with PM2 for persistent scheduling\npm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name datapro-backend',
        codeLanguage: 'bash',
      },
      {
        heading: 'Pipeline run logs',
        body: 'Click "Runs & Logs" on any pipeline card to open the log panel. Each log entry records the full execution result.',
        params: [
          { name: 'status', type: 'success | failed | running | queued', required: true, description: 'Final execution status of the run.' },
          { name: 'timestamp', type: 'ISO 8601', required: true, description: 'UTC timestamp when the run started.' },
          { name: 'duration', type: 'number (ms)', required: true, description: 'Total wall-clock time for the run.' },
          { name: 'rowsIn', type: 'number', required: true, description: 'Row count of the source dataset before transformations.' },
          { name: 'rowsOut', type: 'number', required: true, description: 'Row count of the output dataset after transformations.' },
          { name: 'triggeredBy', type: 'manual | schedule | api', required: true, description: 'What initiated the run.', anchorTarget: 'scheduling' },
          { name: 'steps', type: 'StepResult[]', required: true, description: 'Per-step result array with name, status, duration, and optional error message.', anchorTarget: 'available-transformations' },
        ],
      },
      {
        heading: 'Database destinations',
        body: 'Toggle MySQL, PostgreSQL, BigQuery, or MongoDB in the destination type bar to write the cleaned output directly into a database table. The connection must be registered in Data Sources first. The backend creates the destination table automatically if it does not exist.',
        note: 'For MySQL and PostgreSQL, all column types are inferred from the cleaned DataFrame. Numeric columns become BIGINT or DOUBLE. All other columns become TEXT.',
      },
      {
        heading: 'Google Sheets destination',
        body: 'Toggle Google Sheets in the destination type bar and select a connected sheet. After each run the backend clears the sheet and writes the full cleaned dataset starting at cell A1.',
        warning: 'The backend enforces a 60-second minimum interval between Google Sheets writes to avoid Sheets API quota exhaustion. Runs that occur within 60 seconds of the previous write are skipped silently.',
      },
      {
        heading: 'SQL translation',
        body: 'Click SQL in the top bar to view the auto-generated CTE chain representing the active pipeline. The SQL is dialect-agnostic and compatible with PostgreSQL, BigQuery, Snowflake, and DuckDB.',
        tip: 'Copy the SQL and run it directly in your data warehouse to reproduce the same cleaning logic at scale without the Python backend.',
      },
      {
        heading: 'Approval workflow',
        body: 'Any pipeline can be marked as requiring approval before it is allowed to run. This is useful for pipelines touching sensitive destinations, or as a change-control gate before a new pipeline goes live.',
        params: [
          { name: 'Require approval before running', type: 'checkbox (Save Pipeline modal)', required: false, description: 'When checked at save time, the pipeline is saved with status "pending_approval" instead of the default "approved".' },
          { name: 'Pending Approval badge', type: 'status indicator', required: false, description: 'Shown on the pipeline row in the Saved Pipelines list whenever a pipeline is not yet approved.' },
          { name: 'Approve / Require Approval toggle', type: 'button (pipeline row)', required: false, description: 'Flips the pipeline between "approved" and "pending_approval" at any time after saving.' },
        ],
        warning: 'A pipeline with status "pending_approval" cannot be executed — neither manually via Run Now / Run on Server, nor automatically by the schedule — until it is approved. Attempting to run it returns an explicit "pending approval" error rather than failing silently.',
        note: 'Every approval status change is recorded in Audit Logs under the pipeline.status_changed action, including who changed it and the before/after value.',
      },
      {
        heading: 'Schema change detector',
        body: 'The status badge in the top bar compares the current source schema against the saved baseline after each run.',
        params: [
          { name: 'All Clear (GREEN)', type: 'Status', required: false, description: 'Schema matches the baseline exactly. Safe to run.', anchorTarget: 'pipeline-run-logs' },
          { name: 'Needs Review (YELLOW)', type: 'Status', required: false, description: 'Minor changes detected (e.g. type change). Review recommended before running.', anchorTarget: 'pipeline-run-logs' },
          { name: 'Action Required (RED)', type: 'Status', required: false, description: 'Breaking changes detected (columns added or removed). Pipeline is paused until changes are reviewed.', anchorTarget: 'pipeline-run-logs' },
        ],
        note: 'Click "Review & Approve Fixes" to inspect each change individually. Approved changes update the baseline and resume the pipeline.',
      },
      {
        heading: 'AI Custom Rule',
        body: 'Select AI Custom Rule in the transformation picker. Describe your rule in plain English in the chat modal. Claude interprets the instruction, confirms it back in a LABEL / CONFIRM format, and adds it as a named pipeline step. The backend applies best-effort heuristics during preview; the full rule executes server-side during pipeline runs.',
        code: '// Example natural language rules\n"Remove rows where age is greater than 100"\n"Fill missing salary values with the median salary per department"\n"Flag rows where email does not contain an @ symbol"\n"Cap revenue at the 99th percentile"',
        codeLanguage: 'bash',
      },
      {
        heading: 'Error handling',
        body: 'Common pipeline errors and their resolutions:',
        errors: [
          { code: 'No file available to process', cause: 'Source fetch failed before transformations ran (e.g. MySQL connection dropped).', fix: 'Check the source connection in Data Sources. Re-run after confirming the connection is healthy.' },
          { code: 'Append merge error', cause: 'Column mismatch between source and destination schemas.', fix: 'Ensure the source and destination have compatible schemas. Columns present in one but not the other are filled with null.' },
          { code: 'Google Sheets rate limit hit', cause: 'Two runs completed within 60 seconds with a Sheets destination.', fix: 'Wait 60 seconds and re-run. Reduce schedule frequency if this recurs.' },
          { code: 'Agent query timed out', cause: 'The tunnel agent did not respond within 30 seconds.', fix: 'Restart agent.py. Check that the database is reachable from the agent machine.' },
        ],
      },
    ],
  },
  '/analysis': {
    title: 'Analysis',
    icon: 'chart',
    color: '#8b5cf6',
    sections: [
      {
        heading: 'Overview',
        body: 'Analysis is the data profiling engine. It detects missing values, duplicates, outliers, schema drift, time series patterns, and class imbalances. The profiling runs automatically whenever you switch the active source.',
      },
      {
        heading: 'Quality score',
        body: 'A percentage calculated as (1 - missing_cells / total_cells) × 100. Above 80 is shown in green. Below 80 is shown in red.',
      },
      {
        heading: 'Tabs',
        body: 'Preview: first 100 sample rows. Columns: per-column null count, unique count, dtype, and a sample value. Statistics: pandas describe() output for all numeric columns. Problems: filterable list of every missing value, duplicate row, and outlier with row number and primary key. Time Series: appears only when a date column is detected. AI Clean: chat interface to generate Python/SQL cleaning code.',
      },
      {
        heading: 'Problems tab',
        body: 'Filter by issue type (Missing value, Duplicate row, Outlier) and by column. The table shows row number, primary key value, column name, issue type, and the raw value. Click "Fullscreen" for a full-page view of thousands of rows.',
      },
      {
        heading: 'PII masking in previews',
        body: 'Any column flagged as PII (see Data Catalog → PII detection) is automatically masked wherever raw row data is displayed in Analysis, so sensitive values are not casually visible on screen.',
        params: [
          { name: 'Preview tab', type: 'masked', required: false, description: 'PII column headers are shown with a 🔒 icon in red, and cell values are partially masked (e.g. jo••••@e.com) rather than shown in full.' },
          { name: 'Columns tab', type: 'masked', required: false, description: 'PII columns show a red "PII" pill next to the column name, and the sample value cell is masked the same way as the Preview tab.' },
          { name: 'Fullscreen preview', type: 'masked', required: false, description: 'Opening the Preview tab in fullscreen applies the same masking to the exported row set — masking is not bypassed by the fullscreen view.' },
          { name: 'View Original', type: 'not masked', required: false, description: 'The "View Original" modal intentionally shows raw, unmodified source data as-is, since that is its stated purpose (verifying the untouched source).' },
        ],
        note: 'Masking is display-only — it does not change what is written to cleaned output files or pipeline destinations. It only affects what is rendered on screen in Analysis.',
      },
      {
        heading: 'Time series detection',
        body: 'The backend scans for date columns. If one covers more than 70% of the rows, it is flagged as the time axis. Frequency is inferred from median row spacing: daily ≤1 day, weekly ≤7 days, monthly ≤31 days, quarterly ≤93 days. The chart uses Plotly.js — requires the Plotly CDN script in index.html.',
        tip: 'Add <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script> to the <head> of your index.html to enable the Time Series chart.',
        code: '<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>',
      },
      {
        heading: 'Cleaning section',
        body: 'Detected issues are pre-ticked automatically. Toggle any option and click "Run Cleaning". The backend writes a cleaned CSV and shows a download link. The original file is never overwritten.',
      },
      {
        heading: 'Advanced imputation',
        body: 'Choose from None, Mean, Median, Mode, Forward Fill, Backward Fill, KNN, Constant 0, Unknown, Linear Interpolation, or Index Interpolation. Use instead of "Fill Missing" — not both simultaneously.',
      },
      {
        heading: 'AI Clean tab',
        body: 'Type a plain-English instruction ("remove rows where age > 100"). Claude generates Python pandas code and the equivalent SQL, plus a warning if the operation is destructive. Use quick-command pills for common tasks.',
      },
      {
        heading: 'Edit Flow Source',
        body: 'Click the source name badge or "Edit Flow Source" to switch the active source without leaving Analysis. The new source re-runs the full analysis automatically.',
      },
    ],
  },
  '/audit': {
    title: 'Audit Logs',
    icon: 'file',
    color: '#6366f1',
    sections: [
      {
        heading: 'Overview',
        body: 'Audit Logs records every action taken in the app: source additions, analysis runs, cleaning runs, pipeline saves, pipeline executions, alert configurations, and schema approvals.',
      },
      {
        heading: 'Columns',
        body: 'Time: when the action occurred. Details: human-readable description. Action: machine-readable action type. Entity Type: what was acted on. Entity ID: a UUID for the specific record. View: expand to see the full ID, user, and details.',
      },
      {
        heading: 'Searching',
        body: 'The search box filters across action type, entity type, and the details string. Case-insensitive partial match.',
      },
      {
        heading: 'Group by Trigger',
        body: 'Toggle "Group by Trigger" to collapse all log entries by action type. Each group shows the action name and the count of entries.',
      },
      {
        heading: 'Action types',
        body: 'add_source, add_transformation, remove_transformation, set_alert, analyze, clean, download, open_from_catalog, save_pipeline, pipeline_run, approve_fixes, delete_pipeline, update_schedule, connect_dest_gsheets.',
      },
    ],
  },
  '/tunneling': {
    title: 'Secure Tunneling',
    icon: 'shield',
    color: '#f59e0b',
    sections: [],
  },
}

const ALL_ITEMS = Object.entries(DOCS).flatMap(([path, doc]) =>
  doc.sections.map(s => ({
    path,
    pageTitle: doc.title,
    pageIcon: doc.icon,
    heading: s.heading,
    body: s.body,
    code: s.code,
    tip: s.tip,
  }))
)

export default function Documentation() {
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activePage, setActivePage] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<number | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const referrer = useMemo(() => {
    const from = (location.state as any)?.from as string | undefined
    if (from && DOCS[from]) return from
    const lastPage = localStorage.getItem('datapro_last_page') || ''
    if (lastPage && DOCS[lastPage]) return lastPage
    const found = Object.keys(DOCS).find(k => k !== '/tunneling' && k !== '/docs')
    return found || null
  }, [location.state])

  const referrerLabel = referrer ? DOCS[referrer]?.title : null
  const lastSection = (location.state as any)?.lastSection as string | undefined

  const currentPage = activePage || referrer

  useEffect(() => {
    if (lastSection && !activePage && referrer) {
      // small delay so refs are mounted
      const t = setTimeout(() => {
        const key = `${referrer}__${lastSection}`
        const el = sectionRefs.current[key]
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
      return () => clearTimeout(t)
    }
  }, [lastSection, activePage, referrer])

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(idx)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return ALL_ITEMS.filter(
      item =>
        item.heading.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.pageTitle.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [search])

  const doc = currentPage ? DOCS[currentPage] : null

  const renderSection = (section: DocSection, i: number, pagePath: string) => {
    const refKey = `${pagePath}__${section.heading}`
    const isHighlighted = lastSection === section.heading && pagePath === (activePage || referrer)
    return (
      <div
        key={i}
        ref={el => { sectionRefs.current[refKey] = el }}
        style={{
          padding: '28px 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          scrollMarginTop: '80px',
          transition: 'background 0.4s',
          background: isHighlighted ? 'rgba(139,92,246,0.06)' : 'transparent',
          borderRadius: isHighlighted ? '10px' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.2)',
            userSelect: 'none',
          }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 id={`section-${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} style={{ fontSize: 15, fontWeight: 600, color: '#f1f0ff', margin: 0 }}>
            {section.heading}
          </h3>
          {isHighlighted && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              background: 'rgba(139,92,246,0.25)', color: '#c4b5fd',
              padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase',
            }}>
              Last visited
            </span>
          )}
        </div>

        <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'rgba(255,255,255,0.55)', margin: 0, maxWidth: 680 }}>
          {section.body}
        </p>

        {/* Code block */}
        {section.code && (
          <div style={{
            marginTop: 16, borderRadius: 10, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)', background: '#0d0d14',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                {section.codeLanguage || 'code'}
              </span>
              <button
                onClick={() => handleCopy(section.code!, i)}
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                  fontSize: 11, color: copiedCode === i ? '#86efac' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {copiedCode === i ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{
              margin: 0, padding: '16px',
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              fontSize: 12.5, lineHeight: 1.7,
              color: '#a5f3fc', overflowX: 'auto', whiteSpace: 'pre',
            }}>
              {section.code}
            </pre>
          </div>
        )}

        {/* Params table */}
        {section.params && section.params.length > 0 && (
          <div style={{ marginTop: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Name', 'Type', 'Required', 'Description'].map(h => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: 'left',
                      color: 'rgba(255,255,255,0.35)', fontWeight: 600,
                      fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.params.map((p, pi) => (
                  <tr key={pi} style={{ borderBottom: pi < section.params!.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <td style={{ padding: '10px 14px' }}>
                      {p.anchorTarget ? (
                        <a href={`#section-${p.anchorTarget}`} style={{ textDecoration: 'none' }}>
                          <code style={{
                            fontFamily: 'monospace', fontSize: 12,
                            color: '#c4b5fd', background: 'rgba(196,181,253,0.08)',
                            padding: '1px 6px', borderRadius: 4,
                            cursor: 'pointer', borderBottom: '1px dashed rgba(196,181,253,0.4)',
                          }}>{p.name}</code>
                        </a>
                      ) : (
                        <code style={{
                          fontFamily: 'monospace', fontSize: 12,
                          color: '#c4b5fd', background: 'rgba(196,181,253,0.08)',
                          padding: '1px 6px', borderRadius: 4,
                        }}>{p.name}</code>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ color: '#67e8f9', fontFamily: 'monospace', fontSize: 12 }}>{p.type}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.required
                        ? <span style={{ color: '#f87171', fontSize: 11, fontWeight: 700 }}>Required</span>
                        : <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>Optional</span>}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                      {p.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Errors table */}
        {section.errors && section.errors.length > 0 && (
          <div style={{ marginTop: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(248,113,113,0.15)' }}>
            <div style={{
              padding: '8px 14px', background: 'rgba(248,113,113,0.06)',
              borderBottom: '1px solid rgba(248,113,113,0.1)',
              fontSize: 11, fontWeight: 700, color: '#fca5a5', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>Error Reference</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Code', 'Cause', 'Resolution'].map(h => (
                    <th key={h} style={{
                      padding: '8px 14px', textAlign: 'left',
                      color: 'rgba(255,255,255,0.3)', fontWeight: 600,
                      fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.errors.map((e, ei) => (
                  <tr key={ei} style={{ borderBottom: ei < section.errors!.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <code style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: 12 }}>{e.code}</code>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{e.cause}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{e.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tip */}
        {section.tip && (
          <div style={{
            marginTop: 14, display: 'flex', gap: 12, padding: '12px 16px',
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
            borderRadius: 10, borderLeft: '3px solid #3b82f6',
          }}>
            <Icon name="lightbulb" size={14} color="#93c5fd" />
            <p style={{ fontSize: 13, lineHeight: 1.65, color: '#bfdbfe', margin: 0 }}>{section.tip}</p>
          </div>
        )}

        {/* Warning */}
        {section.warning && (
          <div style={{
            marginTop: 14, display: 'flex', gap: 12, padding: '12px 16px',
            background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 10, borderLeft: '3px solid #f59e0b',
          }}>
            <Icon name="alert" size={14} color="#fbbf24" />
            <p style={{ fontSize: 13, lineHeight: 1.65, color: '#fde68a', margin: 0 }}>{section.warning}</p>
          </div>
        )}

        {/* Note */}
        {section.note && (
          <div style={{
            marginTop: 14, display: 'flex', gap: 12, padding: '12px 16px',
            background: 'rgba(100,116,139,0.07)', border: '1px solid rgba(100,116,139,0.2)',
            borderRadius: 10, borderLeft: '3px solid #64748b',
          }}>
            <Icon name="info" size={14} color="#94a3b8" />
            <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{section.note}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh', background: 'transparent' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{
        width: 228, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        padding: '28px 0',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <div style={{ padding: '0 20px 16px', marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            Documentation
          </p>
        </div>
        {Object.entries(DOCS).map(([path, d]) => {
          const active = currentPage === path
          return (
            <button
              key={path}
              onClick={() => { setActivePage(path); setSearch('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 20px', margin: '0 8px', borderRadius: 8,
                border: 'none', cursor: 'pointer', textAlign: 'left', width: 'calc(100% - 16px)',
                background: active ? 'rgba(139,92,246,0.14)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon name={d.icon} size={13} color={active ? '#c4b5fd' : 'rgba(255,255,255,0.5)'} />
              <span style={{
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? '#e9d5ff' : 'rgba(255,255,255,0.5)',
              }}>
                {d.title}
              </span>
              {d.badge && (
                <span style={{
                  marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 999, letterSpacing: '0.06em',
                  background: `rgba(${active ? '139,92,246' : '255,255,255'},0.1)`,
                  color: active ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                }}>
                  {d.badge}
                </span>
              )}
            </button>
          )
        })}

        <div style={{ marginTop: 'auto', padding: '16px 20px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0, lineHeight: 1.6 }}>
          </p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', maxWidth: 900 }}>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"
            viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documentation…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 10, padding: '11px 14px 11px 38px',
              fontSize: 13.5, color: '#fff', outline: 'none',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16,
              }}
            >×</button>
          )}
        </div>

        {/* ── SEARCH RESULTS ── */}
        {search.trim() && (
          <div>
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                No results for "{search}"
              </div>
            ) : (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {searchResults.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { setActivePage(item.path); setSearch('') }}
                      style={{
                        textAlign: 'left', padding: '14px 18px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <Icon name={item.pageIcon} size={12} color="rgba(255,255,255,0.4)" />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{item.pageTitle}</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>›</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{item.heading}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>
                        {item.body.slice(0, 150)}…
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CONTEXTUAL BANNER — "Since you were on X" ── */}
        {!search.trim() && referrerLabel && !activePage && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 32,
            padding: '16px 20px', borderRadius: 12,
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>
              {referrer && <Icon name={DOCS[referrer].icon} size={16} color="#c4b5fd" />}
            </div>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#e9d5ff' }}>
                Since you were on <span style={{ color: '#c4b5fd' }}>{referrerLabel}</span>
              </p>
              <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>
                {lastSection
                  ? <>Showing documentation for that page. Your last visited section <span style={{ color: '#a78bfa' }}>"{lastSection}"</span> is highlighted below.</>
                  : <>The documentation for that page is shown below. Use the sidebar to explore other sections.</>}
              </p>
            </div>
          </div>
        )}

        {/* ── PAGE HEADER ── */}
        {!search.trim() && doc && (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: `rgba(139,92,246,0.18)`, border: `1px solid rgba(139,92,246,0.35)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                }}>
                  <Icon name={doc.icon} size={18} color="#c4b5fd" />
                </div>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f0ff', margin: 0, letterSpacing: '-0.02em' }}>
                    {doc.title}
                  </h1>
                  {doc.badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                      background: 'rgba(139,92,246,0.2)', color: '#c4b5fd',
                      padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', marginTop: 4, display: 'inline-block',
                    }}>{doc.badge}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                  {doc.sections.length} sections
                </span>
                {currentPage === referrer && !activePage && (
                  <span style={{ fontSize: 12, color: '#a78bfa' }}>↑ You were here</span>
                )}
              </div>
            </div>

            {/* Tunneling special case */}
            {currentPage === '/tunneling' ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <Icon name="shield" size={40} color="rgba(245,158,11,0.55)" />
                </div>
                <p style={{ fontWeight: 600, color: '#fff', fontSize: 15, marginBottom: 8 }}>Secure Tunneling documentation</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 24 }}>
                  Step-by-step guides live directly on the Tunneling page.
                </p>
                <button
                  onClick={() => navigate('/tunneling')}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff', fontWeight: 700, fontSize: 13,
                  }}
                >
                  Go to Tunneling →
                </button>
              </div>
            ) : (
              <div>
                {doc.sections.map((section, i) => renderSection(section, i, currentPage!))}
              </div>
            )}
          </>
        )}

        {/* ── EMPTY STATE ── */}
        {!search.trim() && !doc && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <Icon name="book" size={40} color="rgba(255,255,255,0.2)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Select a section</p>
            <p style={{ fontSize: 13 }}>Pick any topic from the sidebar, or search above.</p>
          </div>
        )}

      </main>
    </div>
  )
}
