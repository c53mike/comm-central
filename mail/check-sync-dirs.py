# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# check-sync-dirs.py --- check that one directory is an exact subset of another
#
# Usage: python check-sync-dirs.py COPY ORIGINAL
#
# Check that the files present in the directory tree COPY are exact
# copies of their counterparts in the directory tree ORIGINAL.  COPY
# need not have all the files in ORIGINAL, but COPY may not have files
# absent from ORIGINAL.
#
# Each directory in COPY may have a file named
# 'check-sync-exceptions', which lists files in COPY that need not be
# the same as the corresponding file in ORIGINAL, or exist at all in
# ORIGINAL.  (The 'check-sync-exceptions' file itself is always
# treated as exceptional.)  Blank lines and '#' comments in the file
# are ignored.

import sys
import os
from os.path import join
import filecmp
import textwrap
import fnmatch

if len(sys.argv) != 3:
    print >> sys.stderr, 'TEST-UNEXPECTED-FAIL | check-sync-dirs.py | Usage: %s COPY ORIGINAL' % sys.argv[0]
    sys.exit(1)

copy = os.path.abspath(sys.argv[1])
original = os.path.abspath(sys.argv[2])


def read_exceptions(filename):
    """
    Return the contents of ``filename``, a 'check-sync-exceptions' file, as a
    set of filenames, along with the basename of ``filename`` itself.  If
    ``filename`` does not exist, return the empty set.
    """
    if (os.path.exists(filename)):
        f = file(filename)
        exceptions = set()
        for line in f:
            line = line.strip()
            if line != '' and line[0] != '#':
                exceptions.add(line)
        exceptions.add(os.path.basename(filename))
        f.close()
        return exceptions
    else:
        return set()


def fnmatch_any(filename, patterns):
    """
    Return ``True`` if ``filename`` matches any pattern in the list of filename
    patterns ``patterns``.
    """
    for pattern in patterns:
        if fnmatch.fnmatch(filename, pattern):
            return True
    return False


def check(copy, original):
    """
    Check the contents of the directory tree ``copy`` against ``original``.  For each
    file that differs, apply REPORT to ``copy``, ``original``, and the file's
    relative path.  ``copy`` and ``original`` should be absolute.  Ignore files
    that match patterns given in files named ``check-sync-exceptions``.
    """
    os.chdir(copy)
    for (dirpath, dirnames, filenames) in os.walk('.'):
        exceptions = read_exceptions(join(dirpath, 'check-sync-exceptions'))
        for dirname in dirnames:
            if fnmatch_any(dirname, exceptions):
                dirnames.remove(dirname)
                break
        for filename in filenames:
            if fnmatch_any(filename, exceptions):
                continue
            relative_name = join(dirpath, filename)
            original_name = join(original, relative_name)
            if (os.path.exists(original_name)
                and filecmp.cmp(relative_name, original_name, False)):
                continue
            report(copy, original, relative_name)


differences_found = False


def report(copy, original, differing):
    """
    Print an error message for ``differing``, which was found to differ between
    ``copy`` and ``original``.  Set the global variable ``differences_found``.
    """
    global differences_found
    if not differences_found:
        print >> sys.stderr, 'TEST-UNEXPECTED-FAIL | check-sync-dirs.py | build file copies are not in sync\n' \
                             'TEST-INFO | check-sync-dirs.py | file(s) found in:               %s\n' \
                             'TEST-INFO | check-sync-dirs.py | differ from their originals in: %s' \
                             % (copy, original)
    print >> sys.stderr, 'TEST-INFO | check-sync-dirs.py | differing file:                 %s' % differing
    differences_found = True


check(copy, original)

if differences_found:
    msg = '''In general, the files in '%s' should always be exact copies of
originals in '%s'.  A change made to one should also be made to the
other.  See 'check-sync-dirs.py' for more details.''' \
         % (copy, original)
    print >> sys.stderr, textwrap.fill(msg, 75)
    sys.exit(1)

print >> sys.stderr, 'TEST-PASS | check-sync-dirs.py | %s <= %s' % (copy, original)
sys.exit(0)
