/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

const HOUSEHOLD_ID = "68a7a49d32c2597e0f1fbe16";
const DEVICE_ID = "68a7a4d932c2597e0f1fbe21";

client.on('connect', () => {
  console.log('Simulator connected to MQTT broker.');

  const commandTopic = `smarthome/household/${HOUSEHOLD_ID}/device/${DEVICE_ID}/command`;
  const statusTopic = `smarthome/household/${HOUSEHOLD_ID}/device/${DEVICE_ID}/status`;

  // Simulate receiving a command from our API
  client.subscribe(commandTopic, (err) => {
    if (!err) {
      console.log(`Subscribed to command topic: ${commandTopic}`);
    }
  });

  client.on('message', (topic, message) => {
    console.log(`Command received: ${topic} - ${message.toString()}`);
    // Simulate processing the command and then publishing the new status back
    setTimeout(() => {
      const command = JSON.parse(message.toString());
      const newStatus = { temperature: command.temperature, status: 'online' }; // New status
      client.publish(statusTopic, JSON.stringify(newStatus));
      console.log(`Status published: ${statusTopic} - ${JSON.stringify(newStatus)}`);
    }, 1000); // Simulate a 1-second delay for the device
  });
});
