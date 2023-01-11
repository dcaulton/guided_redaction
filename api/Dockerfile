ARG BASE_IMAGE=python:3.8.13
FROM ${BASE_IMAGE} as step-base
RUN apt-get -y update && apt-get -y install \
  build-essential \
  cmake \
  enchant-2 \
  ffmpeg \
  iputils-ping \
  less \
  libopenblas-dev \
  liblapack-dev \
  libopencv-dev \
  libsasl2-dev \
  libsasl2-modules-gssapi-mit \
  libssl-dev \
  libsqlite3-dev \
  ncurses-dev \
  nmap \
  python3-opencv \
  swig \
  telnet \
  tesseract-ocr \
  unixodbc \
  unixodbc-dev \
  unzip \
  vim \
  zip \
  freetds-common \
  freetds-dev \
  tdsodbc
# RUN apt-get -y -t stretch-backports install \

FROM step-base as step
ARG steppath=/step
EXPOSE 8002
RUN useradd -m -s /bin/bash -d /home/python python
RUN rm -Rf /mnt/www
WORKDIR $steppath
COPY . $steppath
RUN chown -R python:python ./guided_redaction/data/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt --no-cache-dir
#RUN pip install safety
#RUN safety check -i 44715
#RUN pip uninstall -y safety

FROM step
ARG steppath=/step
WORKDIR $steppath
USER python
CMD ["daphne", "-p", "8002", "server.asgi:application"]
