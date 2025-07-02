FROM node:18

RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libreoffice \
    --no-install-recommends \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* \

WORKDIR /app

# package.json va tsconfig.json fayllarni yuklaymiz
COPY package*.json ./
COPY tsconfig.json ./

# Kutubxonalarni o‘rnatamiz
RUN npm install

# Qolgan fayllarni yuklaymiz
COPY . .

# 🔧 TypeScriptni compile qilamiz
RUN npm run build

# Port ochamiz
EXPOSE 8080

# Ishga tushirish
CMD ["npm", "start"]
