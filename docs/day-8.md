# Week 2, Day 2 — External Integrations: Connecting to the Real World with MQTT

## 🎯 Learning Objective

Today, we will bridge the gap between our cloud-based API and physical IoT devices by integrating an MQTT client. MQTT is a lightweight messaging protocol ideal for IoT environments. This will enable our application to send commands to smart devices and receive real-time status updates from them, making our smart home system truly interactive.

## 🔗 IoT Device Connection

This is a pivotal day for our project. The work done today will enable a physical smart device (like a smart light bulb or sensor running a small microcontroller) to:

*   **Subscribe to a specific MQTT topic** to receive commands from our API (e.g., `household/[householdId]/devices/[deviceId]/command`).
*   **Publish messages to an MQTT topic** to report its status changes (e.g., `household/[householdId]/devices/[deviceId]/status`).
*   **Communicate securely** with our backend using an MQTT broker.

## 💡 Design Decisions

1.  **MQTT Library:**
    *   We will use the popular and robust `mqtt.js` library to handle the MQTT connection, publishing, and subscribing within our Node.js application.
2.  **Centralized MQTT Service:**
    *   We will create a dedicated `MqttService` to manage the MQTT client instance and encapsulate all MQTT-related logic. This service will be initialized once when the server starts.
3.  **Dynamic Topic Subscriptions:**
    *   Instead of subscribing to every possible device topic on startup, our service will be designed to dynamically subscribe to topics as needed, or use wildcards to subscribe to all device status topics. For simplicity in this tutorial, we'll use a wildcard subscription.
4.  **API-to-Device Communication Flow:**
    *   When a user updates a device via our REST API (e.g., turning on a light), the `device.service.ts` will call the `MqttService` to publish a command to the appropriate MQTT topic.
5.  **Device-to-API Communication Flow:**
    *   The `MqttService` will subscribe to status topics. When a physical device publishes a status update (e.g., a sensor detecting motion), the `MqttService` will receive the message, parse it, and update the device's state in our MongoDB database. This database update will, in turn, trigger a WebSocket event to notify all connected web clients, thanks to the work we did yesterday.

## 🏗️ Step-by-step Implementation

### 1. Install `mqtt`

First, add the `mqtt` library to the project.

```bash
npm install mqtt --save
```

### 2. Create the MQTT Service (`src/services/mqtt.service.ts`)

This service will handle all our MQTT logic.

Create a new file: `src/services/mqtt.service.ts`

```typescript
// smart-home-automation-api/src/services/mqtt.service.ts
import mqtt, { MqttClient } from 'mqtt';
import logger from '../utils/logger';
import { env } from '../config/env';
import { updateDeviceStatus } from './device.service'; // We will create this function

let client: MqttClient;

const MQTT_BROKER_URL = env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org'; // Default to a public test broker

export const initializeMqtt = () => {
  client = mqtt.connect(MQTT_BROKER_URL);

  client.on('connect', () => {
    logger.info(`Connected to MQTT broker at ${MQTT_BROKER_URL}`);
    // Subscribe to all device status topics
    client.subscribe('household/+/devices/+/status', (err) => {
      if (err) {
        logger.error('MQTT subscription error:', err);
      } else {
        logger.info('Subscribed to device status topics');
      }
    });
  });

  client.on('message', async (topic, payload) => {
    logger.debug(`Received MQTT message on topic ${topic}: ${payload.toString()}`);
    try {
      const topicParts = topic.split('/');
      const householdId = topicParts[1];
      const deviceId = topicParts[3];
      const data = JSON.parse(payload.toString());

      // Update the device status in the database
      await updateDeviceStatus(deviceId, data);

    } catch (error) {
      logger.error('Error processing MQTT message:', error);
    }
  });

  client.on('error', (error) => {
    logger.error('MQTT client error:', error);
  });
};

export const publishCommand = (householdId: string, deviceId: string, command: object) => {
  if (!client) {
    logger.error('MQTT client not initialized.');
    return;
  }
  const topic = `household/${householdId}/devices/${deviceId}/command`;
  const payload = JSON.stringify(command);
  client.publish(topic, payload, (err) => {
    if (err) {
      logger.error(`Failed to publish MQTT command to ${topic}`, err);
    } else {
      logger.info(`Published command to ${topic}: ${payload}`);
    }
  });
};
```

### 3. Update `server.ts` to Initialize the MQTT Service

We need to start our MQTT client when the server starts.

Open `src/server.ts` and add:

```typescript
// ... other imports
import { initializeMqtt } from './services/mqtt.service'; // NEW

// ... after connectDB()
connectDB();
initializeMqtt(); // NEW: Initialize the MQTT service
// ...
```

### 4. Update `device.service.ts`

First, we need a new function, `updateDeviceStatus`, that can be called by our MQTT service. This function will receive a status update from a device and update the database. This will in turn trigger the websocket event to the frontend.

Add the following function to `src/services/device.service.ts`:

```typescript
// smart-home-automation-api/src/services/device.service.ts
// ... other imports
import { emitToHousehold } from '../realtime/socket';

// ... (at the end of the file)

// NEW: Function to be called by MQTT service
export const updateDeviceStatus = async (deviceId: string, data: Partial<IDevice['data']>) => {
  const device = await Device.findById(deviceId);
  if (!device) {
    logger.warn(`Received MQTT status for unknown device: ${deviceId}`);
    return;
  }

  const updatedDevice = await Device.findOneAndUpdate(
    { _id: deviceId },
    { $set: { data } },
    { new: true, runValidators: true }
  );

  if (updatedDevice) {
    logger.info(`Device status updated via MQTT for ${deviceId}`);
    // Emit a real-time event to all household members
    emitToHousehold('device:update', updatedDevice.household, updatedDevice);
  }
};
```

Next, modify the existing `updateDevice` function to publish an MQTT command. This is how the user's action in the web UI gets transmitted to the physical device.

```typescript
// smart-home-automation-api/src/services/device.service.ts
// ... other imports
import { publishCommand } from './mqtt.service'; // NEW

// ... in updateDevice function, after the device is successfully updated
export const updateDevice = async (deviceId: string, userId: string, updateData: Partial<IDevice>): Promise<IDevice> => {
  // ... (existing logic to find and authorize device)

  const { household, owner, ...safeUpdateData } = updateData;
  const updatedDevice = await Device.findOneAndUpdate(
    { _id: deviceId },
    { $set: safeUpdateData },
    { new: true, runValidators: true }
  );

  if (!updatedDevice) {
    throw new CustomError('Failed to update device.', 500);
  }

  logger.info(`Device '${updatedDevice.name}' updated by user ${userId}.`);

  // Emit a real-time event to all household members
  emitToHousehold('device:update', updatedDevice.household, updatedDevice);

  // NEW: Publish a command to the physical device via MQTT
  publishCommand(updatedDevice.household.toString(), updatedDevice._id.toString(), updatedDevice.data);

  return updatedDevice;
};
```

### 5. Add MQTT Broker to Environment Variables

For this to work, we need to configure the MQTT broker URL. For now, we are using a public test broker, but for a real application, you would host your own.

Add this to your `.env` file (or just rely on the default in the code for now).

```
MQTT_BROKER_URL=mqtt://test.mosquitto.org
```

-----

## ✅ Validation Steps

Testing this requires an MQTT client to act as a simulated IoT device.

1.  **Start the API:**
    *   Run `docker-compose up --build` to restart the server with the new changes.

2.  **Use an MQTT Client:**
    *   You can use a command-line tool like `mosquitto_sub` and `mosquitto_pub`, or a GUI client like [MQTT Explorer](https://mqtt-explorer.com/).

3.  **Simulate a Device:**
    *   In your MQTT client, subscribe to the command topic for a device you have created. For example: `household/68a783fbaf810f69fdfa9339/devices/68a78494af810f69fdfa9347/command`
    *   Now, use `curl` (or your web UI) to update the device's state (e.g., turn the light on).
    *   **Expected:** You should see the command `{ "on": true }` appear in your MQTT client.

4.  **Simulate a Device Status Update:**
    *   In your MQTT client, publish a message to the status topic for the same device: `household/68a783fbaf810f69fdfa9339/devices/68a78494af810f69fdfa9347/status`
    *   The payload should be a JSON string, e.g., `{ "on": false, "brightness": 50 }`.
    *   **Expected:** Check your `client.html` browser console. You should see a `device:update` event pushed from the server via WebSockets, reflecting the new status you just published via MQTT.

This round-trip test proves that your API is now a fully-functional hub for both web clients and physical IoT devices.

-----
