# Personalised Gift Registry

## Project Overview

Build a modern React web application that functions similarly to a wedding registry, but is designed for general occasions such as birthdays, Christmas, anniversaries, housewarmings, or any situation where someone wants to share a personal wishlist with friends and family.

The core problem this application solves is **duplicate gifts**.

A recipient may have a single wishlist that they share with multiple people. Friends and family need to be able to see what is already being considered or purchased so that multiple people do not accidentally buy the same item.

However, the **recipient must not be able to see which gifts have been claimed or purchased**. This allows the system to prevent duplicate gifts while preserving the surprise.

The application should feel more personal and fun than a traditional wedding registry. It should be designed around the idea of giving thoughtful gifts to someone rather than encouraging excessive spending.

---

# Core User Roles

## Recipient

The recipient is the person who creates and owns a wishlist.

They should be able to:

* Create an account and log in.
* Create one or more gift lists.
* Add, edit, and remove gifts.
* Customise information associated with each gift.
* Share a unique access code for their list.
* View their wishlist without seeing which items have been claimed or purchased.
* Organise, sort, and filter their gifts.

The recipient should **never be shown the claiming/purchasing status of their gifts**.

For example, if three gifts have been claimed by other users, the recipient should still see those gifts as normal wishlist items.

## Gift Giver

A gift giver is someone who accesses a wishlist using the recipient's share code.

They should be able to:

* Enter a registry/list access code.
* Browse the recipient's available gifts.
* View detailed information about each gift.
* Indicate that they are considering buying an item.
* Claim an item when they have decided to purchase it.
* Add their name to the item so other gift givers know who is considering/purchasing it.
* Optionally create an account.
* Continue using the list without creating an account.

An account is optional for gift givers.

If a gift giver creates an account, their name/details should be remembered so they do not need to repeatedly enter their name when interacting with gifts.

If they do not create an account, they can continue using the access code, but they may need to provide their name when interacting with items.

---

# Wishlist Access

When a recipient creates a gift list, the application should generate a unique access code.

The recipient can give this code to friends and family.

The code provides access to the gift list without requiring the gift giver to have an account.

The intended workflow is:

1. Recipient creates a gift list.
2. Application generates a unique share/access code.
3. Recipient shares the code with friends and family.
4. Gift giver enters the code.
5. Gift giver can browse the wishlist.
6. Gift giver can mark gifts as being considered or purchased.
7. Other gift givers can see that an item has already been claimed.
8. Recipient continues to see the wishlist normally without seeing claim/purchase information.

The system should carefully separate **recipient-visible information** from **gift-giver-visible information**.

---

# Gift Items

Each gift should be highly customisable.

A gift item should support at least:

* Title
* Description
* Image
* External URL/link
* Price/cost
* Category
* Status
* Dependencies

### Categories

Recipients should be able to assign gifts to categories.

Examples could include:

* Games
* Books
* Technology
* Home
* Hobbies
* Clothing
* Experiences

Categories should not be hard-coded where possible. The recipient should be able to create and manage their own categories.

### Dependencies

A gift may depend on another gift.

For example:

* A game may depend on a particular game console.
* A camera lens may depend on a specific camera.
* A board game expansion may depend on owning the base game.

The recipient should be able to specify these relationships.

The UI should make dependencies understandable to gift givers so they can see when purchasing one item without another may not make sense.

The dependency system should support relationships between multiple gifts rather than only a single parent/child relationship.

---

# Sorting and Filtering

Gift lists should be sortable and filterable using the available gift information.

Potential sorting options include:

* Price
* Name
* Category
* Recently added
* Claimed/unclaimed status

Potential filters include:

* Category
* Priority
* Price range
* Claimed/unclaimed
* Gifts with dependencies
* Other useful gift attributes

The filtering and sorting system should be designed to remain usable on mobile devices.

---

# Claiming and Purchasing

This is one of the most important parts of the application.

There should be a distinction between:

### Considering

A gift giver is thinking about purchasing an item but has not necessarily committed to buying it.

### Claimed/Purchased

A gift giver has decided that they are responsible for purchasing the item.

Other gift givers should be able to see that someone has claimed an item so they do not purchase the same gift.

The recipient should not be able to see either of these states.

The exact data model and permissions should be designed around this privacy requirement.

Multiple people may potentially be interested in the same gift, so the application should consider how "considering" and "claimed" states interact.

---

# Authentication

The recipient should have a proper user account.

Gift givers should have two options:

### Option 1: Guest

They can use the list access code without creating an account.

### Option 2: Account

They can create an account.

Creating an account should make the experience more convenient by remembering their name and other relevant information.

The application should not unnecessarily force gift givers to create accounts because the main purpose of the access code is to make sharing a wishlist simple.

Authentication and authorisation should ensure that:

* Recipients can only manage their own lists.
* Gift givers can only access lists they have been given access to.
* Recipients cannot access private gift-giver claim information.
* Guest users can interact with gifts without having a permanent account.

---

# UI/UX

The application should use a modern, polished design.

The primary design priorities are:

1. Mobile usability
2. Simplicity
3. Clear information hierarchy
4. Modern visual design
5. A fun and personal feeling

The application will likely be accessed more frequently from mobile phones than desktop computers, so the design should be **mobile-first**.

Desktop should still be fully supported.

The UI should use professional iconography rather than emojis.

Use an established icon library where appropriate rather than manually creating icons.

---

# Visual Style

Although the application should look polished and professional, it should not feel like corporate enterprise software.

The overall feeling should be:

* Fun
* Warm
* Personal
* Friendly
* Modern
* Celebratory
* Light-hearted

It should feel appropriate for birthdays, Christmas, anniversaries, and other occasions centred around friends, family, generosity, and celebration.

Avoid designs that make the application feel like a shopping marketplace or encourage users to spend as much money as possible.

The application is fundamentally about **helping people give thoughtful gifts without accidentally buying the same thing**.

The design should communicate that philosophy.

Avoid:

* Excessive gamification
* Aggressive sales/commerce styling
* Overly corporate UI
* Excessive animations
* Emoji-based UI
* Cluttered interfaces

Animations and visual effects can be used where they improve the experience, but they should remain purposeful.

---

# Technical Requirements

The frontend should be built using **React**.

The application should be structured so that it can eventually support a production backend, authentication, persistent data, and multiple users.

Prioritise:

* Clean component architecture
* Reusable components
* Maintainable code
* Responsive design
* Accessibility
* Clear separation between UI, application logic, and data access
* Secure handling of permissions and private information

Do not unnecessarily over-engineer the initial implementation.

The architecture should, however, avoid decisions that would make future backend integration difficult.

---

# Important Privacy Requirement

The most important business rule is:

> **The recipient must never know which gifts have been claimed or purchased.**

This should not simply be implemented by hiding the information with CSS or conditionally hiding UI elements.

The application's data model, API design, authentication, and authorisation should prevent the recipient from receiving private gift-giver information in the first place.

For example, recipient-facing API responses should not contain claim/purchase information that the frontend merely chooses not to display.

Treat gift-giver claim information as private data.

---

# Initial Goal

The initial goal is to establish a solid foundation for the application rather than attempting to build every possible feature immediately.

Start by defining:

1. Application architecture
2. User roles and permissions
3. Data models
4. Gift list structure
5. Gift item structure
6. Authentication approach
7. Access-code system
8. Claim/purchase privacy model
9. Responsive UI structure
10. Core user flows

Before implementing complex features, identify any ambiguities or architectural decisions that could significantly affect the project.

When making assumptions, document them rather than silently introducing behaviour that was not specified.
