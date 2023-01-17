# guided_redaction

An API and UI for guided redaction and analysis tasks.

Uses Python, OpenCV and Tesseract and the EAST algorithm to analyze and redact information on images.

Has a GUI to facilitate day to day redaction tasks as well as research.

## NEW FEATURE - CONTAINERIZATION
- Jan 2023: shortly, this product will be runnable as Docker containers, also as a kubernetes deployment

## to install the backend
- Python 3 is required.
- For desktop, set up a python virtualenv just to keep things tidy.  It's your call on a dockerized server container.
- ( MAYBE NOT, hold off on this for now)- install opencv.  If you're using a mac this will be useful: https://www.pyimagesearch.com/2018/08/17/install-opencv-4-on-macos/
- install tesseract.  If you're using a mac, try this: https://www.pyimagesearch.com/2017/07/03/installing-tesseract-for-ocr/
- check this repository out
- start it up with the webserver

## to install the frontend
- install the latest version of Node.js

## to run
- run docker-compose build from the root directory 
- access the api at localhost/api, the application at localhost

# OLD TO RUN:
- start django server
-- load virtualenv, change directory to guided_redaction/api, then `python manage.py runserver`
- start npm server
-- change directory to the guided_redaction/gui/redact-app, then `npm start`
- start celerys broker
-- locally for me that's rabbit mq.  then `rabbitmq-server` 
- start celery
-- load virtualenv, cd to guided_redaction/api, then `celery -A server.celery worker  --loglevel=info`
-- IF RUNNING ON MAC, you need this to make zip_movie work, possibly also on linux systems:
     `export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES`
- make sure images are being served up as urls
-- for my default home setup, that's nginx on port 8080.  then `sudo nginx` 
