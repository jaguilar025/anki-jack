# Usa una imagen base de Node.js
FROM node:18

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos del proyecto al contenedor
COPY . .


ENV OPENAI_API_KEY=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
ENV VOICEVOX_URL=http://127.0.0.1:50021


# Instala las dependencias
RUN npm install --force

# Construye la aplicación de Next.js
RUN npm run build

# Expón el puerto donde Next.js se ejecutará
EXPOSE 3000

# Inicia la aplicación
CMD ["npm", "start"]
