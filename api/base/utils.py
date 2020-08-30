import logging
import os
from base64 import b64decode


def base64urldecode(arg): 
    filtered = arg.replace("-", "+").replace("_", "/") 
    padded = filtered + "=" * ((len(filtered) * -1) % 4) 
    return b64decode(padded)


def log_mem_usage(label, module_name=None, loglevel="debug"):
    import psutil
    process = psutil.Process(os.getpid())
    if module_name is None:
        module_name = __name__
    log = logging.getLogger(module_name)
    mem = process.memory_info()[0] / 10**6
    getattr(log, loglevel.lower())(f"label: {mem:.06} Mi")
