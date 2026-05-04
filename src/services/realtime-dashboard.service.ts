import { DashboardService } from './dashboard.service';
import { logger } from '../utils/logger.util';

export class RealtimeDashboardService {
  private static io: any;
  private static updateInterval: NodeJS.Timeout;

  static initialize(io: any) {
    this.io = io;
    this.setupSocketHandlers();
    this.startPeriodicUpdates();
  }

  private static setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Dashboard client connected: ${socket.id}`);

      socket.on('join-dashboard', async (data: { role: string; facilityId: string; userId: string }) => {
        const { role, facilityId, userId } = data;
        const roomName = `dashboard-${facilityId}-${role}`;
        
        socket.join(roomName);
        socket.data = { role, facilityId, userId };
        
        // Send initial dashboard data
        try {
          const dashboardData = await DashboardService.getDashboardByRole(role, facilityId, userId);
          socket.emit('dashboard-data', dashboardData);
        } catch (error) {
          logger.error('Error sending initial dashboard data:', error);
          socket.emit('dashboard-error', { message: 'Failed to load dashboard data' });
        }
      });

      socket.on('request-refresh', async () => {
        const { role, facilityId, userId } = socket.data || {};
        if (!role || !facilityId) return;

        try {
          const dashboardData = await DashboardService.getDashboardByRole(role, facilityId, userId);
          socket.emit('dashboard-data', dashboardData);
        } catch (error) {
          logger.error('Error refreshing dashboard data:', error);
          socket.emit('dashboard-error', { message: 'Failed to refresh dashboard data' });
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Dashboard client disconnected: ${socket.id}`);
      });
    });
  }

  private static startPeriodicUpdates() {
    // Update dashboard data every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.broadcastUpdates();
    }, 30000);
  }

  private static async broadcastUpdates() {
    const rooms = this.io.sockets.adapter.rooms;
    
    for (const [roomName] of rooms) {
      if (roomName.startsWith('dashboard-')) {
        const [, facilityId, role] = roomName.split('-');
        
        try {
          // Get all sockets in this room to get user data
          const socketsInRoom = await this.io.in(roomName).fetchSockets();
          if (socketsInRoom.length === 0) continue;

          const userId = socketsInRoom[0].data?.userId;
          const dashboardData = await DashboardService.getDashboardByRole(role, facilityId, userId);
          
          this.io.to(roomName).emit('dashboard-update', dashboardData);
        } catch (error) {
          logger.error(`Error broadcasting update to room ${roomName}:`, error);
        }
      }
    }
  }

  static async notifyDataChange(facilityId: string, changeType: string, data?: any) {
    // Notify all dashboard rooms for this facility
    const rooms = this.io.sockets.adapter.rooms;
    
    for (const [roomName] of rooms) {
      if (roomName.startsWith(`dashboard-${facilityId}-`)) {
        this.io.to(roomName).emit('data-change', {
          type: changeType,
          data,
          timestamp: new Date()
        });
      }
    }
  }

  static stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
