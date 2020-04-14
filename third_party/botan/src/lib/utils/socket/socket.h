/*
* OS specific utility functions
* (C) 2015,2016,2017 Jack Lloyd
*
* Botan is released under the Simplified BSD License (see license.txt)
*/

#ifndef BOTAN_SOCKET_H_
#define BOTAN_SOCKET_H_

#include <botan/types.h>
#include <string>
#include <chrono>

namespace Botan {

namespace OS {

/*
* This header is internal (not installed) and these functions are not
* intended to be called by applications. However they are given public
* visibility (using BOTAN_TEST_API macro) for the tests. This also probably
* allows them to be overridden by the application on ELF systems, but
* this hasn't been tested.
*/


/**
* A wrapper around a simple blocking TCP socket
*/
class BOTAN_TEST_API Socket
   {
   public:
      /**
      * The socket will be closed upon destruction
      */
      virtual ~Socket() = default;

      /**
      * Write to the socket. Blocks until all bytes sent.
      * Throws on error.
      */
      virtual void write(const uint8_t buf[], size_t len) = 0;

      /**
      * Reads up to len bytes, returns bytes written to buf.
      * Returns 0 on EOF. Throws on error.
      */
      virtual size_t read(uint8_t buf[], size_t len) = 0;
   };

/**
* Open up a socket. Will throw on error. Returns null if sockets are
* not available on this platform.
*/
std::unique_ptr<Socket>
BOTAN_TEST_API open_socket(const std::string& hostname,
                           const std::string& service,
                           std::chrono::milliseconds timeout);

} // OS
} // Botan

#endif
