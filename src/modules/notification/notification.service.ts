import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { CreateNotificationInput, INotification } from "../../interfaces/notification.interface";
import { Notification } from "./notification.model";

const LIST_LIMIT = 50;

export const createNotification = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: CreateNotificationInput
): Promise<INotification> => {
  const notification = await Notification.create({
    company: companyId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link || "",
  });

  return notification.toObject();
};

export const listNotifications = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<INotification[]> => {
  return await Notification.find({ company: companyId })
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean<INotification[]>();
};

export const countUnreadNotifications = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<number> => {
  return await Notification.countDocuments({ company: companyId, read: false });
};

export const markNotificationRead = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  notificationId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<INotification> => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, company: companyId },
    { $set: { read: true } },
    { new: true }
  ).lean<INotification>();

  if (!notification) {
    throw new Error("Notificación no encontrada");
  }

  return notification;
};

export const markAllNotificationsRead = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<{ success: boolean }> => {
  await Notification.updateMany(
    { company: companyId, read: false },
    { $set: { read: true } }
  );

  return { success: true };
};
