import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class DockerOrchestrationService {
  private static readonly COMPOSE_FILE = path.join(process.cwd(), '../../docker-compose.multi-tenant.yml');
  private static readonly NGINX_CONFIG = path.join(process.cwd(), '../../nginx-multi-tenant.conf');

  static async provisionTenantInfrastructure(tenantData: {
    subdomain: string;
    tenantId: string;
    dbName: string;
  }) {
    try {
      // 1. Update docker-compose file
      await this.addTenantToCompose(tenantData);
      
      // 2. Update nginx configuration
      await this.addTenantToNginx(tenantData);
      
      // 3. Deploy new containers
      await this.deployTenantContainers(tenantData.subdomain);
      
      return { success: true, message: 'Infrastructure provisioned successfully' };
    } catch (error) {
      console.error('Infrastructure provisioning failed:', error);
      throw new Error(`Failed to provision infrastructure: ${error.message}`);
    }
  }

  private static async addTenantToCompose(tenantData: {
    subdomain: string;
    tenantId: string;
    dbName: string;
  }) {
    const { subdomain, tenantId, dbName } = tenantData;
    const port = await this.getNextAvailablePort();

    const tenantServices = `
  # ${subdomain} - Auto-generated
  app-${subdomain}:
    build: .
    ports:
      - "${port}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db-${subdomain}:5432/${dbName}
      - REDIS_URL=redis://redis-${subdomain}:6379
      - TENANT_ID=${tenantId}
    depends_on:
      - db-${subdomain}
      - redis-${subdomain}

  db-${subdomain}:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${dbName}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data_${subdomain.replace('-', '_')}:/var/lib/postgresql/data

  redis-${subdomain}:
    image: redis:7-alpine
    volumes:
      - redis_data_${subdomain.replace('-', '_')}:/data
`;

    const volumeEntries = `  postgres_data_${subdomain.replace('-', '_')}:
  redis_data_${subdomain.replace('-', '_')}:`;

    // Read current compose file
    let composeContent = await fs.readFile(this.COMPOSE_FILE, 'utf8');
    
    // Add services before volumes section
    composeContent = composeContent.replace(
      /^volumes:/m,
      `${tenantServices}\nvolumes:`
    );
    
    // Add volumes
    composeContent += `\n${volumeEntries}`;

    await fs.writeFile(this.COMPOSE_FILE, composeContent);
  }

  private static async addTenantToNginx(tenantData: { subdomain: string }) {
    const { subdomain } = tenantData;
    
    const upstreamConfig = `    server app-${subdomain}:3000;`;
    const serverConfig = `
    # ${subdomain} subdomain
    if ($host = ${subdomain}.yourdomain.com) {
        set $upstream app-${subdomain};
    }`;

    let nginxContent = await fs.readFile(this.NGINX_CONFIG, 'utf8').catch(() => this.getDefaultNginxConfig());
    
    // Add upstream server
    nginxContent = nginxContent.replace(
      /(upstream app \{[^}]*)/,
      `$1\n${upstreamConfig}`
    );
    
    // Add server routing
    nginxContent = nginxContent.replace(
      /(location \/ \{)/,
      `${serverConfig}\n\n        $1`
    );

    await fs.writeFile(this.NGINX_CONFIG, nginxContent);
  }

  private static async deployTenantContainers(subdomain: string) {
    // Deploy specific tenant services
    await execAsync(`docker-compose -f ${this.COMPOSE_FILE} up -d app-${subdomain} db-${subdomain} redis-${subdomain}`);
    
    // Reload nginx
    await execAsync(`docker-compose -f ${this.COMPOSE_FILE} exec nginx nginx -s reload`);
  }

  private static async getNextAvailablePort(): Promise<number> {
    const { stdout } = await execAsync('docker ps --format "{{.Ports}}" | grep -o ":[0-9]*->" | grep -o "[0-9]*" | sort -n');
    const usedPorts = stdout.split('\n').filter(Boolean).map(Number);
    
    let port = 3001;
    while (usedPorts.includes(port)) {
      port++;
    }
    return port;
  }

  private static getDefaultNginxConfig(): string {
    return `events {
    worker_connections 1024;
}

http {
    upstream app {
        # Tenant servers will be added here
    }

    server {
        listen 80;
        server_name *.yourdomain.com;
        
        set $upstream app;
        
        location / {
            proxy_pass http://$upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}`;
  }

  static async removeTenantInfrastructure(subdomain: string) {
    try {
      // Stop and remove containers
      await execAsync(`docker-compose -f ${this.COMPOSE_FILE} stop app-${subdomain} db-${subdomain} redis-${subdomain}`);
      await execAsync(`docker-compose -f ${this.COMPOSE_FILE} rm -f app-${subdomain} db-${subdomain} redis-${subdomain}`);
      
      // Remove from compose file (implementation needed)
      // Remove from nginx config (implementation needed)
      
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to remove infrastructure: ${error.message}`);
    }
  }
}