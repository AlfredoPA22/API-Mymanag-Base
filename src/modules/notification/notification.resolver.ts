import { INotification } from "../../interfaces/notification.interface";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service";

export const notificationResolver = {
  Query: {
    async listNotifications(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<INotification[]> {
      return await listNotifications(context.user.companyId);
    },
    async countUnreadNotifications(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<number> {
      return await countUnreadNotifications(context.user.companyId);
    },
  },
  Mutation: {
    async markNotificationRead(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<INotification> {
      return await markNotificationRead(context.user.companyId, args.notificationId);
    },
    async markAllNotificationsRead(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      return await markAllNotificationsRead(context.user.companyId);
    },
  },
};
