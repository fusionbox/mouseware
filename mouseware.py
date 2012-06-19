#!/usr/bin/env python

import glob
from os.path import splitext, basename
import random

import sys
import os
import termios
import fcntl
import time
import re


def getch():
    fd = sys.stdin.fileno()

    oldterm = termios.tcgetattr(fd)
    newattr = termios.tcgetattr(fd)
    newattr[3] = newattr[3] & ~termios.ICANON & ~termios.ECHO
    termios.tcsetattr(fd, termios.TCSANOW, newattr)

    oldflags = fcntl.fcntl(fd, fcntl.F_GETFL)
    fcntl.fcntl(fd, fcntl.F_SETFL, oldflags | os.O_NONBLOCK)

    try:
        while 1:
            try:
                c = sys.stdin.read(1)
                break
            except IOError:
                pass
    finally:
        termios.tcsetattr(fd, termios.TCSAFLUSH, oldterm)
        fcntl.fcntl(fd, fcntl.F_SETFL, oldflags)
    return c

words = {}

src = "txt/*"

for file in glob.glob(src):
    with open(file, 'r') as f:
        place = splitext(basename(file))[0]
        # using list(set( words )) unique-ifies the words
        words[place] = list(set([i.strip() for i in f]))

sentence = []
construct = ['adjective', 'noun', 'verb', 'adjective', 'noun']
for place in construct:
    sentence.append(random.choice(words[place]))

sys.stderr.write("Press random keys.. for entropy!\n")
now = time.time()
entropy = 0
bits = ''
remove = re.compile(r'[0-9]+\.')
while entropy < 512:
    getch()
    # subtract time.time() - now
    delta = str(time.time() - now)
    # remove everything before the '.', so that we have a high-precision delta
    delta = remove.sub('', delta)
    # reverse, so the "most random" stuff is in front.  These ranges drop the
    # .1 resolution
    delta = delta[-1:0:-1]
    for d in delta:
        # grab a few bits
        bits += str(int(d) % 2)
        entropy += 1
        if entropy % 16 == 0:
            sys.stderr.write('.')
        if entropy == 512:
            break
random.seed(int(bits, 2))

print(' '.join(sentence))
