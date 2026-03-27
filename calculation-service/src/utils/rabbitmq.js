const amqp = require('amqplib');

let channel;

async function connectQueue() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();

    await channel.assertQueue('meal_queue');

    console.log('✅ RabbitMQ connected (calculation-service)');
  } catch (error) {
    console.error('❌ RabbitMQ error:', error);
  }
}

function sendToQueue(data) {
  if (!channel) {
    console.error('❌ Channel not ready - cannot send message');
    return false;
  }

  try {
    const sent = channel.sendToQueue('meal_queue', Buffer.from(JSON.stringify(data)));
    
    if (sent) {
      console.log('📤 Message sent successfully:', data);
      return true;
    } else {
      console.error('❌ Failed to send message - queue buffer full');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
    return false;
  }
}

module.exports = { connectQueue, sendToQueue };
