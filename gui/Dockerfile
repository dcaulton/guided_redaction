FROM node:10 AS build
RUN npm update npm
COPY redact-app /js
RUN cd /js && npm ci
RUN cd / && \
  git clone https://github.com/pscottdevos/regexp-tree.git regexp-tree && \
  cd /regexp-tree && \
  npm ci && \
  mv /regexp-tree/dist /js/node_modules/regexp-tree/
RUN cd /js && env PUBLIC_URL=/step-workbench npm run build
WORKDIR /js
CMD ["npm", "start"]

#FROM nginx:1.17.5 AS final
#RUN mkdir /www
#COPY www /www
#COPY --from=build /js/build /www
#RUN rm /etc/nginx/conf.d/default.conf
#COPY docker/default.conf /etc/nginx/conf.d/default.conf
#EXPOSE 80/tcp
#EXPOSE 443/tcp
#CMD ["nginx", "-g", "daemon off;"]
