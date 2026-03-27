const amqp = require('amqplib');
const mongoose = require('mongoose');
const { runCalculation } = require('./services/calculation.service');
require('dotenv').config();

async function startConsumer() {
  try {
    // Connect to MongoDB first
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected');

    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertQueue('meal_queue');

    console.log('📥 RabbitMQ Consumer started - Waiting for messages...');

    // Set prefetch to 1 to process one message at a time
    await channel.prefetch(1);

    channel.consume('meal_queue', async (msg) => {
      if (!msg) return;
      
      try {
        const data = JSON.parse(msg.content.toString());

        console.log('📩 Message received:', data);
        console.log('⚙️ Calling runCalculation...');

        // Trigger calculation for the received date
        const result = await runCalculation(data.date);

        console.log('🔥 Result object:', result);
        console.log('🔥 Result.success:', result?.success);

        if (result && result.success) {
          console.log('✅ Calculation done');
          console.log('✅ Calculation completed:', result);
          channel.ack(msg);
        } else {
          console.error('❌ Calculation failed');
          console.error('❌ Result:', result);
          channel.ack(msg);
        }
      } catch (error) {
        console.error('❌ Error processing message:', error.message);
        console.error('❌ Error stack:', error.stack);
        channel.nack(msg, false, true); // Requeue on error
      }
    }, { noAck: false });
  } catch (error) {
    console.error('❌ Consumer error:', error);
    process.exit(1);
  }
}

startConsumer();
