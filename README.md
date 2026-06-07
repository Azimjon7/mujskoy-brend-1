# Mujskoy Brend - Local Setup

Quick notes to run the project locally.

Prerequisites
- Node.js (16+ recommended)

Install

```bash
npm install
```

Run

```bash
# production / default
npm start

# development (same in this repo)
npm run dev
```

Environment
Create a `.env` file in the project root with at least:

```
PORT=5003
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=pass
# Optional for Telegram notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Files & folders
- `uploads/` : uploaded images (preserve existing contents)
- `data/` : JSON data stores (`products.json`, `orders.json`, `categories.json`, `promocodes.json`, `reviews.json`)

Notes
- Do not commit `node_modules` or `.env` to version control.
- `npm start` runs `node server.js` which serves the static files and APIs.

If you want, I can now:
- Run the app locally and test main flows
- Update visual styles on additional pages (shop, cart, checkout, index)
- Implement related-products loading on product-details
