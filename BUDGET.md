# Unified Social Scheduler for Streamers – MVP Version

**Budget: €2000**

## 1. Project Summary
The Unified Social Scheduler for Streamers is a web-based platform designed to help content creators manage and schedule social media posts across multiple platforms including Twitch, Twitter/X, Instagram (Business), and Discord. This Minimum Viable Product (MVP) focuses on delivering core functionality with a minimal budget while ensuring usability and scalability.

## 2. Key Features
- OAuth2 authentication with:
  - Twitch
  - Twitter/X
  - Instagram (Business accounts only)
  - Discord
- Secure token storage and refresh system
- Basic calendar interface for scheduling posts
- Platform-specific actions:
  - Twitter: Post text and images
  - Twitch: Schedule streams
  - Discord: Send channel messages via bot
  - Instagram: Save posts (manual publishing if API restricted)
- Background task runner using cron or similar
- Admin panel for viewing logs and monitoring status

## 3. Technology Stack
- Frontend: React + Tailwind CSS
- Backend: Node.js (Express) or Python Flask
- Database: PostgreSQL
- Storage: Optional AWS S3 or Firebase

## 4. Cost Breakdown
| Task | Estimated Cost (€) |
|------------------------------------------------------------------|-------------|
| User Authentication & OAuth2                                     | €400        |
| UI Calendar & Dashboard                                          | €500        |
| Backend APIs & Scheduler Logic                                   | €600        |
| Job Runner & Logs System                                         | €300        |
| Testing, Deployment & Fixes                                      | €200        |
|------------------------------------------------------------------|-------------|
| **Total**                                                        | **2000**    |

## 5. Next Steps
- Finalize tech stack
- Design basic UI wireframes
- Begin OAuth2 integrations
- Test with sample users
- Launch beta version 