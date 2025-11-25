import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(@Req() req: any) {
    const userId = req.user.userId;
    return await this.notificationsService.getUserNotifications(userId);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.userId;
    return await this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return await this.notificationsService.markAsRead(id);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.markAllAsRead(userId);
    return { message: 'Todas las notificaciones marcadas como leídas' };
  }
}
