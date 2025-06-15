FROM node:18

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
