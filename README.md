# Preowned Tech Buying Companion

**Preowned Tech Discovery and Comparison**

An AI-powered backend system for helping users discover, compare, and evaluate preowned technology before making a purchase.

The system supports **Buyers, Sellers, and Moderators**. Buyers can browse approved listings, compare products based on their requirements and budget, review disclosures, ask technical questions, create shortlists, and request viewings. Sellers can create and manage listings and provide information about the condition of their devices. Moderators can review listings and handle moderation activities.

The project combines a secure marketplace backend with AI-powered product comparison, semantic search, and RAG-based technical assistance.

## Tech Stack

- Node.js
- Express.js
- MongoDB / MongoDB Atlas
- Mongoose
- MongoDB Atlas Vector Search
- LangChain JS
- Ollama
- Zod

## Main Features

### Authentication and Security

- User registration and login
- Password hashing and password reset
- Verified email access
- Server-side session management
- Role-based access control
- Protected API routes
- CSRF protection and rate limiting
- Session expiry and revocation

### Listing Management

- Sellers can create and manage preowned technology listings
- Listings follow an approval workflow
- Buyers can browse approved active listings
- Listing visibility is controlled based on status and user role
- Device specifications and condition information are stored with listings
- Sold and suspended listings are appropriately restricted

### Buyer Features

- Browse available preowned technology
- View listing details and specifications
- Shortlist listings
- Ask questions about products
- Request product viewings
- Compare multiple products based on requirements
- Get AI-assisted recommendations within a defined budget

### Seller Features

- Create and manage listings
- Provide device condition and disclosure information
- Submit private evidence related to listings
- Respond to buyer questions
- Manage listings through the approval workflow

## AI-Powered Assistance

The system features an intelligent AI shopping assistant designed to help buyers find suitable technology:

- **Smart Product Discovery:** Finds suitable listings tailored to specific needs and budget.
- **Side-by-Side Comparison:** Compares device specifications directly against buyer requirements.
- **Condition & Disclosure Review:** Checks seller details, item condition reports, and disclosures.
- **Strict Budget Protection:** Ensures recommendations respect the defined price limit.

## RAG and Semantic Search

The system uses LangChain, Ollama, and MongoDB Atlas Vector Search to support technical and compatibility-related questions.

Relevant documentation and specification information can be retrieved for questions related to:

- Device compatibility
- Upgrades
- Technical specifications
- Hardware requirements

Retrieved information is used as context when generating answers.

## Privacy and Moderation

Private seller evidence and sensitive information such as serial numbers are protected from public exposure and unauthorized AI access.

Moderators can review listings and record moderation decisions while maintaining role-based access restrictions.

## Backend Architecture

The application is organized into separate backend components:

- **Controllers** — application and business logic
- **Routes** — API endpoints
- **Models** — MongoDB/Mongoose data models
- **Middleware** — authentication, authorization, CSRF, rate limiting, and error handling
- **Services** — AI, vector search, email, and other supporting services
- **Configuration** — database and application configuration

## Core Data

The backend manages data for areas such as:

- Users and sessions
- Listings
- Product specifications
- Private evidence
- Shortlists
- Buyer questions
- Viewing requests
- Moderation events
- AI and document runs
- Specification and vector data

## Team Contributions

| Member | Name | Contribution |
|---|---|---|
| Member 1 | Yashwanth Sai Burugu | Authentication and User Management |
| Member 2 | Pullela Meghana | Database Architecture and Models |
| Member 3 | Vidhathri Locula | Database Seeding and Mock Data |
| Member 4 | Roopesh Gullapalli | Public Listing and Buyer APIs |
| Member 5 | Sarayu Vegesna | Seller Management APIs |
| Member 6 | Sharvani Cheruku | Data Privacy and Protection |
| Member 7 | Sri Charan Kasam | MongoDB Atlas Vector Search |
| Member 8 | Gopi Chowdary | Embeddings and Document Processing |
| Member 9 | Krishna Chaitanya Reddy | RAG and Validation |
| Member 10 | Hasini Kottey | AI Comparison Agent and Tool Integration |

## AI Workflow

The AI system processes buyer requests and determines which backend tools are needed.

Depending on the request, it can:

1. Search listings.
2. Compare specifications.
3. Inspect seller disclosures.

For technical questions, the RAG pipeline retrieves relevant information from available documentation and uses it as context for the response.

Privacy and authorization checks are applied so that restricted seller information is not unnecessarily exposed during AI processing.

## Project Scope

The project focuses on making the process of evaluating preowned technology secure, structured, and AI-assisted.

The current scope includes:

- Secure marketplace APIs
- Buyer and seller workflows
- Listing moderation
- Product comparison
- AI buyer assistance
- RAG-based technical assistance
- Semantic document retrieval
- Privacy-aware evidence handling

## Project

**Preowned Tech Buying Companion — Capstone Project**

A collaborative backend and AI project covering authentication, database management, marketplace workflows, security, semantic search, RAG, and AI-assisted product comparison.
