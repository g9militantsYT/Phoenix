const fs = require('fs');
const path = require('path');
const { log } = require('../index');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  setup: (client, sharedLog) => {
    // Additional setup logic, if needed
  },
  data: {
    name: 'setinfo',
    description: 'Ask the user for their Discord user ID.',
  },
  execute: async (interaction, sharedLog) => {
    try {
      const userTag = interaction.user.tag;

      // Log using the shared log function
      sharedLog(`Command "/setinfo" used by ${userTag}.`);

      if (!interaction.replied) {
        const user = interaction.user;

        // Ask the user for their Discord user ID
        await interaction.reply(`Hello ${user.tag}! Please provide your Discord user ID.`);

        // Collect the user's response
        const filter = (response) => response.author.id === user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000 }); // Adjust the time as needed (in milliseconds)

        collector.on('collect', (response) => {
          const userId = response.content;

          // Log the user's provided ID
          sharedLog(`${user.tag} provided Discord user ID: ${userId}`);

          // Save user data to a JSON file
          saveUserData(userId, { userId, username: user.tag });

          // Respond to the user acknowledging their input
          interaction.followUp(`Thank you, ${user.tag}! Your Discord user ID (${userId}) has been noted.`);

          // Stop the collector after collecting the response
          collector.stop();
        });

        collector.on('end', (collected, reason) => {
          if (reason === 'time') {
            interaction.followUp(`Time is up! Please run the command again to provide your Discord user ID.`);
          }
        });
      }
    } catch (error) {
      const errorMessage = `Error executing "/setinfo" command: ${error}`;

      // Log using the shared log function
      sharedLog(errorMessage);

      // Log error to the newest log file
      logToFile(errorMessage);

      // Log error to webhook
      await sharedLogToWebhook(errorMessage);

      await interaction.reply('An error occurred while processing the command.');
    }
  },
};

// Function to save user data to a JSON file
function saveUserData(userId, userData) {
  const usersFolder = './users';
  const userFilePath = path.join(usersFolder, `${userId}.json`);

  // Ensure the "users" folder exists
  if (!fs.existsSync(usersFolder)) {
    fs.mkdirSync(usersFolder);
  }

  // Write user data to the JSON file
  fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2));

  // Log to console
  console.log(`User data saved to: ${userFilePath}`);
}

// Function to log messages to the specified webhook using Axios
async function sharedLogToWebhook(message) {
  const webhookURL = process.env.WEBHOOK_URL;

  if (webhookURL) {
    try {
      await axios.post(webhookURL, { content: message });
    } catch (webhookError) {
      console.error(`Error logging to webhook: ${webhookError.message}`);
      // Log webhook error details to the newest log file
      logToFile(`Error logging to webhook: ${webhookError.message}`);
    }
  } else {
    console.warn('Webhook URL not provided in the environment variables.');
    // Log warning details to the newest log file
    logToFile('Webhook URL not provided in the environment variables.');
  }
}

// Function to append messages to the newest file in the "logs" folder
function logToFile(message) {
  const logsFolder = './logs';

  const logFiles = fs.readdirSync(logsFolder).filter(file => file.endsWith('.log'));
  logFiles.sort((a, b) => fs.statSync(path.join(logsFolder, b)).mtime.getTime() - fs.statSync(path.join(logsFolder, a)).mtime.getTime());

  const newestLogFile = logFiles.length > 0 ? logFiles[0] : new Date().toISOString().replace(/:/g, '-') + '.log';
  const logFilePath = path.join(logsFolder, newestLogFile);

  fs.appendFileSync(logFilePath, `${message}\n`);
  console.log(message); // Log to console
}
