# 📧 MailMind : Reclaim Your Inbox

**AI-Driven Email Intelligence & Action Management Platform**

![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-6DB33F?style=flat&logo=spring-boot&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-EA4335?style=flat&logo=google&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)

## Overview

Modern professionals are drowning in email. According to McKinsey Global Institute, knowledge workers spend about 28% of their workweek on email, yet current email systems offer little intelligence beyond filters and folders. Critical deadlines hide in lengthy emails, important action items go unnoticed, and users spend hours manually sorting through clutter to identify what truly matters.

**MailMind** solves this with an intelligent email analysis platform. Instead of forcing users to manually categorize and prioritize, MailMind uses Generative AI to transform unstructured emails into actionable intelligence, seamlessly integrated into Gmail via Chrome Extension.

When a user receives an email, MailMind's AI automatically:

1. **Analyzes** the email to understand its core meaning, intent, and context
2. **Extracts** key information, including required actions, deadlines, and priority levels
3. **Identifies patterns** to detect duplicates and recurring issues
4. **Generates replies** that match the tone and context of the original message
5. **Routes to the dashboard**, where all insights are unified and trackable

Beyond simple categorization, MailMind includes an AI-Powered Insights Module that analyzes email patterns over time. This helps users understand their communication workload, identify bottlenecks, track action item completion rates, and receive alerts about critical deadlines, all from a single dashboard.

The system integrates with Gmail via a Chrome Extension, requiring no change to the user's existing workflow. Users see the intelligence directly in their inbox, and can generate replies, track actions, and receive smart notifications on Telegram.

## Key Features

- 🤖 **Intelligent Email Analysis** – Gemini AI understands email content, intent, and context
- 📝 **Auto-Summarization** – Condense lengthy emails into concise summaries instantly
- 🏷️ **Smart Categorization** – Automatically classify emails by type and importance
- 🚨 **Priority Detection** – Identify and flag urgent emails automatically
- ✅ **Action Extraction** – Surface required actions and next steps from email text
- 📅 **Deadline Intelligence** – Automatically detect and track email deadlines
- 💬 **AI Reply Generation** – Generate contextual, tone-matched email replies
- 📊 **Unified Dashboard** – View and manage all email intelligence in one place
- ✔️ **Action Tracking** – Monitor completion of extracted tasks and items
- 📱 **Smart Notifications** – Receive Telegram alerts for priority emails and deadlines
- 🔌 **Chrome Extension** – Zero-friction Gmail integration—no app switching

## How It Works

The system follows a clean request-response flow:

```
Gmail Inbox
    ↓
Chrome Extension (Captures Email)
    ↓
Spring Boot Backend (API Layer)
    ↓
Gemini AI (Analysis & Generation)
    ↓
PostgreSQL (Storage & Tracking)
    ↓
Dashboard & Telegram Notifications
```

When you receive an email, the Chrome Extension captures it and sends it to the backend. The Gemini AI model analyzes the content, extracts insights (summary, priority, actions, deadlines), and returns results to the dashboard. You can generate replies, track actions, and receive Telegram notifications—all from one unified interface.

## Tech Stack

- **Frontend:** React.js, Vite, CSS — Used to build the interactive dashboard and user interface.
- **Backend:** Java, Spring Boot, REST APIs, Maven — Used to build the backend services and API layer.
- **Database:** PostgreSQL, Flyway — Used for storing email analysis data and managing database migrations.
- **AI & Integrations:** Google Gemini AI, Telegram — Gemini AI powers email analysis and reply generation, while Telegram is used for notifications.
- **Chrome Extension:** JavaScript, Chrome Extension APIs, Manifest V3 — Used to integrate MailMind directly with Gmail.

## Project Structure

```
AI-Email-Intelligence-Assistant/
│
├── email-writer-frontend/
│   └── React.js application for the analytics dashboard
│       (View, track, and manage email intelligence)
│
├── email-writer-sb/
│   └── Spring Boot backend service
│       (REST APIs, email processing, Gemini AI integration)
│
└── email-writer-ext/
    └── Chrome Extension
        (Seamless Gmail integration, email capture)
```

## Impact

- 💡 **Save Time** – Reclaim 8+ hours per week from email management and prioritization
- ✨ **Never Miss Deadlines** – Automatic deadline extraction and intelligent tracking
- 🎯 **Reduce Decision Fatigue** – AI-powered priority assessment eliminates manual sorting
- 📈 **Improve Response Quality** – Intelligent reply suggestions enhance email effectiveness
- 🚀 **Boost Productivity** – Eliminate manual email categorization and focus on meaningful work
- 🤝 **Better Coordination** – Shared action item visibility across email threads
- 📊 **Data-Driven Insights** – Understand communication patterns, bottlenecks, and workload trends

## Vision

**To eliminate email management as a productivity bottleneck.**

In a world of information overload, MailMind believes intelligent systems should handle the complexity of email organization, allowing professionals to focus on high-impact work. By combining cutting-edge AI with thoughtful design, MailMind transforms email from a burden into a streamlined, intelligent workflow.

**Reclaim your inbox. Reclaim your time. With MailMind.**
