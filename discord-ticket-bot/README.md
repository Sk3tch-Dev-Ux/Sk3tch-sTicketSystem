# Tactica Ticket Bot

A comprehensive Discord ticket system with rich embeds, modal forms, transcripts, and full admin configuration.

![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Ready-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### Core Features
- **🎫 Rich Embeds** - Beautiful, customizable ticket panels and messages
- **📝 Ticket Logging** - All ticket actions logged to a dedicated channel
- **📄 Ticket Transcripts** - HTML transcripts saved and optionally DM'd to users
- **😀 Emoji Support** - Custom emojis for categories and buttons
- **🎛️ Ticket Panel** - Interactive button-based ticket creation

### Advanced Features
- **🏷️ Auto Tagging** - Automatically ping support roles when tickets are created
- **📌 Claim Tickets** - Staff can claim tickets to take ownership
- **🔄 Transfer Tickets** - Transfer ticket ownership to another staff member
- **➕ Add Members** - Add any member to view and participate in a ticket
- **📋 Modal Forms** - Customizable questionnaires before ticket creation (up to 5 fields)

### Admin Features
- **Unlimited Categories** - Create as many ticket categories as needed
- **Per-Category Roles** - Different support roles for different categories
- **Per-Category Channels** - Route tickets to specific Discord categories
- **Customizable Messages** - Set welcome messages per category
- **Feature Toggles** - Enable/disable transcripts, claims, auto-tag, etc.

## 📦 Installation

### Prerequisites
- Node.js v18 or higher
- MongoDB database
- Discord Bot Token

### Steps

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd discord-ticket-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
MONGODB_URI=mongodb://localhost:27017/ticketbot
GUILD_ID=your_guild_id_here  # Optional: for faster command registration
```

4. **Start the bot**
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## 🔧 Configuration

### Initial Setup

1. **Set up log channel**
```
/setup logs channel:#ticket-logs
```

2. **Set up transcript channel**
```
/setup transcripts channel:#transcripts
```

3. **Add support roles**
```
/setup support-role role:@Support action:Add
```

4. **Add admin roles** (optional - Administrators already have access)
```
/setup admin-role role:@Admins action:Add
```

### Creating Categories

1. **Create a basic category**
```
/category create name:Bug Report description:Report game-breaking bugs emoji:🐛
```

2. **Create a category with a Discord category channel**
```
/category create name:Support description:General support emoji:💬 ticket-category:#Support-Tickets
```

3. **Add form fields to a category**
```
/category add-form-field category:Bug Report
```
Then fill out the modal with your question details.

4. **Add category-specific roles**
```
/category add-role category:Bug Report role:@Bug-Hunters
```

5. **Set custom welcome message**
```
/category welcome-message category:Bug Report message:Thanks for reporting! Please be patient while we investigate.
```

### Deploying the Panel

```
/panel send channel:#open-a-ticket
```

To update the panel after making changes:
```
/panel update
```

## 📋 Commands

### Setup Commands (Admin Only)
| Command | Description |
|---------|-------------|
| `/setup logs` | Set the ticket log channel |
| `/setup transcripts` | Set the transcript channel |
| `/setup support-role` | Add/remove support roles |
| `/setup admin-role` | Add/remove admin roles |
| `/setup color` | Set embed color (hex) |
| `/setup name` | Set server name for embeds |
| `/setup toggle` | Toggle features on/off |
| `/setup view` | View current settings |

### Category Commands (Admin Only)
| Command | Description |
|---------|-------------|
| `/category create` | Create a new ticket category |
| `/category delete` | Delete a category |
| `/category edit` | Edit category details |
| `/category list` | List all categories |
| `/category add-role` | Add support role to category |
| `/category remove-role` | Remove support role from category |
| `/category add-form-field` | Add a form field |
| `/category clear-form` | Remove all form fields |
| `/category welcome-message` | Set welcome message |

### Panel Commands (Admin Only)
| Command | Description |
|---------|-------------|
| `/panel send` | Send/resend the ticket panel |
| `/panel update` | Update existing panel |

### Ticket Commands (In Ticket Channels)
| Command | Description |
|---------|-------------|
| `/ticket close` | Close the ticket |
| `/ticket claim` | Claim the ticket |
| `/ticket unclaim` | Unclaim the ticket |
| `/ticket transfer` | Transfer to another staff |
| `/ticket add` | Add a member to ticket |
| `/ticket remove` | Remove a member from ticket |
| `/ticket rename` | Rename the ticket channel |
| `/ticket transcript` | Generate transcript |
| `/ticket info` | View ticket information |

## 🎨 Customization

### Button Styles
Categories support different button colors:
- **Primary** (Blue) - Default
- **Secondary** (Grey)
- **Success** (Green)
- **Danger** (Red)

### Form Field Styles
- **Short** - Single line input (max 100 characters)
- **Paragraph** - Multi-line input (max 1000 characters)

### Embed Color
Set your brand color with:
```
/setup color hex:#5865F2
```

## 📁 Project Structure

```
discord-ticket-bot/
├── src/
│   ├── commands/
│   │   ├── setup.js       # Server configuration
│   │   ├── category.js    # Category management
│   │   ├── panel.js       # Panel management
│   │   ├── ticket.js      # Ticket actions
│   │   └── index.js
│   ├── events/
│   │   ├── ready.js       # Bot startup
│   │   ├── interactionCreate.js
│   │   └── index.js
│   ├── handlers/
│   │   ├── ticketHandler.js    # Ticket creation/actions
│   │   └── categoryHandler.js  # Category modals
│   ├── models/
│   │   ├── GuildSettings.js
│   │   ├── TicketCategory.js
│   │   ├── Ticket.js
│   │   └── index.js
│   ├── utils/
│   │   ├── embeds.js      # Embed builders
│   │   ├── permissions.js # Permission checks
│   │   ├── transcript.js  # Transcript generation
│   │   ├── logger.js      # Ticket logging
│   │   └── index.js
│   ├── config.js          # Default configuration
│   └── index.js           # Entry point
├── .env.example
├── package.json
└── README.md
```

## 🔒 Permissions

The bot requires the following permissions:
- Manage Channels
- Manage Roles
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Add Reactions
- Use External Emojis

**Bot Token Intents Required:**
- Guilds
- Guild Messages
- Guild Members
- Message Content
- Direct Messages

## 🤝 Support

If you encounter issues:
1. Check that all environment variables are set correctly
2. Ensure MongoDB is running and accessible
3. Verify the bot has required permissions
4. Check the console for error messages

## 📄 License

MIT License - feel free to modify and use for your own projects!

---

Made with ❤️ for Discord communities
