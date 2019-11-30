from celery import shared_task

@shared_task
def say_whut(thing1):
    print('say whuuuut?')
    print(thing1)
