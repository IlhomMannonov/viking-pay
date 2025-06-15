# Rasmiy Node.js image asosida
FROM node:18

# App fayllari uchun ishchi papka
WORKDIR /app

# package.json va package-lock.json ni nusxalash
COPY package*.json ./

# npm install
RUN npm install

# Barcha boshqa fayllarni yuklash
COPY . .

# Serverni qaysi portda eshitishini e'lon qilish
EXPOSE 8080

# Loyihani ishga tushirish
CMD ["npm", "start"]
