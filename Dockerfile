# 1. Node image
FROM node:18

# 2. Ishchi papkani tanlash
WORKDIR /app

# 3. Paket fayllarni nusxalash va o'rnatish
COPY package*.json ./
RUN npm install

# 4. Butun loyihani nusxalash
COPY . .

# 5. Loyiha build qilish
RUN npm run build

# 6. Port ochish (agar 3000 bo‘lsa)
EXPOSE 3000

# 7. Loyihani ishga tushirish
CMD ["node", "dist/index.js"]
