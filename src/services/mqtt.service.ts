// smart-home-automation-api/src/services/mqtt.service.ts
import Aedes, { Client } from "aedes";
import * as net from "net";
import * as mqtt from "mqtt";
import { Types } from "mongoose";
import logger from "../utils/logger";
import Device from "../models/Device";
import { emitToHousehold } from "../realtime/socket";

const MQTT_PORT = 1883;
let aedesBroker: Aedes;
let mqttClient: mqtt.MqttClient;

// Senior Insight: Use a robust topic structure for multi-tenancy and clarity.
const getCommandTopic = (householdId: string, deviceId: string) =>
  `smarthome/household/${householdId}/device/${deviceId}/command`;

const getStatusTopic = (householdId: string, deviceId: string) =>
  `smarthome/household/${householdId}/device/${deviceId}/status`;

export const initializeMqttBroker = () => {
  aedesBroker = new Aedes();

  aedesBroker.on("client", (client: Client) => {
    logger.info(`MQTT Client connected: ${client.id}`);
  });

  aedesBroker.on("clientDisconnect", (client: Client) => {
    logger.info(`MQTT Client disconnected: ${client.id}`);
  });

  const server = net.createServer(aedesBroker.handle);
  server.listen(MQTT_PORT, () => {
    logger.info(`MQTT Broker is running on port ${MQTT_PORT}`);
    // Once the broker is running, initialize our internal MQTT client
    initializeMqttClient();
  });
};

const initializeMqttClient = () => {
  const clientUrl = `mqtt://localhost:${MQTT_PORT}`;
  mqttClient = mqtt.connect(clientUrl);

  mqttClient.on("connect", () => {
    logger.info("Internal MQTT client connected to broker.");
    // Subscribe to all status topics for all devices on startup
    mqttClient.subscribe("smarthome/household/+/device/+/status", (err) => {
      if (err) {
        logger.error({ err }, "MQTT subscription error");
      } else {
        logger.info("Subscribed to device status topics");
      }
    });
  });

  mqttClient.on("message", async (topic, payload) => {
    try {
      const parts = topic.split("/");
      const householdId = parts[2];
      const deviceId = parts[4];
      const data = JSON.parse(payload.toString());

      if (parts[5] === "status") {
        logger.info({ data }, `Received status update on topic ${topic}:`);

        const device = await Device.findById(deviceId);
        if (device) {
          // Update the device in our database
          device.data = { ...device.data, ...data };
          if (data.status) {
            device.status = data.status as "online" | "offline" | "unknown" | "pending";
          }
          await device.save();

          // Use our real-time service to push the update to clients
          emitToHousehold(
            "device:update",
            new Types.ObjectId(householdId),
            device,
          );
        } else {
          logger.warn(`Received status for non-existent device: ${deviceId}`);
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Error handling MQTT message");
    }
  });

  mqttClient.on("error", (error) => {
    logger.error({ err: error }, "MQTT Client Error");
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const subscribeToAllDeviceStatusTopics = async () => {
  const devices = await Device.find({}, "household _id");
  const topics = devices.map((device) =>
    getStatusTopic(device.household.toString(), device._id.toString()),
  );
  if (topics.length > 0) {
    mqttClient.subscribe(topics, (err) => {
      if (err) {
        logger.error({ err }, "Failed to subscribe to status topics");
      } else {
        logger.info(`Subscribed to ${topics.length} device status topics.`);
      }
    });
  }
};

/**
 * Publishes a command to a specific device via MQTT.
 * @param householdId The ID of the household.
 * @param deviceId The ID of the device.
 * @param command The command payload to send.
 */
export const publishCommand = (
  householdId: Types.ObjectId,
  deviceId: Types.ObjectId,
  command: Partial<Record<string, unknown>>,
) => {
  if (!mqttClient || !mqttClient.connected) {
    logger.error("MQTT client not connected. Cannot publish command.");
    return;
  }
  const topic = getCommandTopic(householdId.toString(), deviceId.toString());
  mqttClient.publish(topic, JSON.stringify(command));
  logger.info(
    { command },
    `Published command to MQTT topic '${topic}' with payload:`,
  );
};
