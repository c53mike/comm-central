/*
* RIPEMD-160
* (C) 1999-2007 Jack Lloyd
*
* Botan is released under the Simplified BSD License (see license.txt)
*/

#include <botan/rmd160.h>
#include <botan/loadstor.h>
#include <botan/rotate.h>

namespace Botan {

std::unique_ptr<HashFunction> RIPEMD_160::copy_state() const
   {
   return std::unique_ptr<HashFunction>(new RIPEMD_160(*this));
   }

namespace {

/*
* RIPEMD-160 F1 Function
*/
template<size_t S>
inline void F1(uint32_t& A, uint32_t B, uint32_t& C, uint32_t D, uint32_t E,
               uint32_t M)
   {
   A += (B ^ C ^ D) + M;
   A  = rotl<S>(A) + E;
   C  = rotl<10>(C);
   }

/*
* RIPEMD-160 F2 Function
*/
template<size_t S>
inline void F2(uint32_t& A, uint32_t B, uint32_t& C, uint32_t D, uint32_t E,
               uint32_t M)
   {
   A += (D ^ (B & (C ^ D))) + M;
   A  = rotl<S>(A) + E;
   C  = rotl<10>(C);
   }

/*
* RIPEMD-160 F3 Function
*/
template<size_t S>
inline void F3(uint32_t& A, uint32_t B, uint32_t& C, uint32_t D, uint32_t E,
               uint32_t M)
   {
   A += (D ^ (B | ~C)) + M;
   A  = rotl<S>(A) + E;
   C  = rotl<10>(C);
   }

/*
* RIPEMD-160 F4 Function
*/
template<size_t S>
inline void F4(uint32_t& A, uint32_t B, uint32_t& C, uint32_t D, uint32_t E,
               uint32_t M)
   {
   A += (C ^ (D & (B ^ C))) + M;
   A  = rotl<S>(A) + E;
   C  = rotl<10>(C);
   }

/*
* RIPEMD-160 F5 Function
*/
template<size_t S>
inline void F5(uint32_t& A, uint32_t B, uint32_t& C, uint32_t D, uint32_t E,
               uint32_t M)
   {
   A += (B ^ (C | ~D)) + M;
   A  = rotl<S>(A) + E;
   C  = rotl<10>(C);
   }

}

/*
* RIPEMD-160 Compression Function
*/
void RIPEMD_160::compress_n(const uint8_t input[], size_t blocks)
   {
   const uint32_t MAGIC2 = 0x5A827999, MAGIC3 = 0x6ED9EBA1,
                  MAGIC4 = 0x8F1BBCDC, MAGIC5 = 0xA953FD4E,
                  MAGIC6 = 0x50A28BE6, MAGIC7 = 0x5C4DD124,
                  MAGIC8 = 0x6D703EF3, MAGIC9 = 0x7A6D76E9;

   for(size_t i = 0; i != blocks; ++i)
      {
      load_le(m_M.data(), input, m_M.size());

      uint32_t A1 = m_digest[0], A2 = A1,
               B1 = m_digest[1], B2 = B1,
               C1 = m_digest[2], C2 = C1,
               D1 = m_digest[3], D2 = D1,
               E1 = m_digest[4], E2 = E1;

      F1<11>(A1,B1,C1,D1,E1,m_M[ 0]       );  F5< 8>(A2,B2,C2,D2,E2,m_M[ 5]+MAGIC6);
      F1<14>(E1,A1,B1,C1,D1,m_M[ 1]       );  F5< 9>(E2,A2,B2,C2,D2,m_M[14]+MAGIC6);
      F1<15>(D1,E1,A1,B1,C1,m_M[ 2]       );  F5< 9>(D2,E2,A2,B2,C2,m_M[ 7]+MAGIC6);
      F1<12>(C1,D1,E1,A1,B1,m_M[ 3]       );  F5<11>(C2,D2,E2,A2,B2,m_M[ 0]+MAGIC6);
      F1< 5>(B1,C1,D1,E1,A1,m_M[ 4]       );  F5<13>(B2,C2,D2,E2,A2,m_M[ 9]+MAGIC6);
      F1< 8>(A1,B1,C1,D1,E1,m_M[ 5]       );  F5<15>(A2,B2,C2,D2,E2,m_M[ 2]+MAGIC6);
      F1< 7>(E1,A1,B1,C1,D1,m_M[ 6]       );  F5<15>(E2,A2,B2,C2,D2,m_M[11]+MAGIC6);
      F1< 9>(D1,E1,A1,B1,C1,m_M[ 7]       );  F5< 5>(D2,E2,A2,B2,C2,m_M[ 4]+MAGIC6);
      F1<11>(C1,D1,E1,A1,B1,m_M[ 8]       );  F5< 7>(C2,D2,E2,A2,B2,m_M[13]+MAGIC6);
      F1<13>(B1,C1,D1,E1,A1,m_M[ 9]       );  F5< 7>(B2,C2,D2,E2,A2,m_M[ 6]+MAGIC6);
      F1<14>(A1,B1,C1,D1,E1,m_M[10]       );  F5< 8>(A2,B2,C2,D2,E2,m_M[15]+MAGIC6);
      F1<15>(E1,A1,B1,C1,D1,m_M[11]       );  F5<11>(E2,A2,B2,C2,D2,m_M[ 8]+MAGIC6);
      F1< 6>(D1,E1,A1,B1,C1,m_M[12]       );  F5<14>(D2,E2,A2,B2,C2,m_M[ 1]+MAGIC6);
      F1< 7>(C1,D1,E1,A1,B1,m_M[13]       );  F5<14>(C2,D2,E2,A2,B2,m_M[10]+MAGIC6);
      F1< 9>(B1,C1,D1,E1,A1,m_M[14]       );  F5<12>(B2,C2,D2,E2,A2,m_M[ 3]+MAGIC6);
      F1< 8>(A1,B1,C1,D1,E1,m_M[15]       );  F5< 6>(A2,B2,C2,D2,E2,m_M[12]+MAGIC6);

      F2< 7>(E1,A1,B1,C1,D1,m_M[ 7]+MAGIC2);  F4< 9>(E2,A2,B2,C2,D2,m_M[ 6]+MAGIC7);
      F2< 6>(D1,E1,A1,B1,C1,m_M[ 4]+MAGIC2);  F4<13>(D2,E2,A2,B2,C2,m_M[11]+MAGIC7);
      F2< 8>(C1,D1,E1,A1,B1,m_M[13]+MAGIC2);  F4<15>(C2,D2,E2,A2,B2,m_M[ 3]+MAGIC7);
      F2<13>(B1,C1,D1,E1,A1,m_M[ 1]+MAGIC2);  F4< 7>(B2,C2,D2,E2,A2,m_M[ 7]+MAGIC7);
      F2<11>(A1,B1,C1,D1,E1,m_M[10]+MAGIC2);  F4<12>(A2,B2,C2,D2,E2,m_M[ 0]+MAGIC7);
      F2< 9>(E1,A1,B1,C1,D1,m_M[ 6]+MAGIC2);  F4< 8>(E2,A2,B2,C2,D2,m_M[13]+MAGIC7);
      F2< 7>(D1,E1,A1,B1,C1,m_M[15]+MAGIC2);  F4< 9>(D2,E2,A2,B2,C2,m_M[ 5]+MAGIC7);
      F2<15>(C1,D1,E1,A1,B1,m_M[ 3]+MAGIC2);  F4<11>(C2,D2,E2,A2,B2,m_M[10]+MAGIC7);
      F2< 7>(B1,C1,D1,E1,A1,m_M[12]+MAGIC2);  F4< 7>(B2,C2,D2,E2,A2,m_M[14]+MAGIC7);
      F2<12>(A1,B1,C1,D1,E1,m_M[ 0]+MAGIC2);  F4< 7>(A2,B2,C2,D2,E2,m_M[15]+MAGIC7);
      F2<15>(E1,A1,B1,C1,D1,m_M[ 9]+MAGIC2);  F4<12>(E2,A2,B2,C2,D2,m_M[ 8]+MAGIC7);
      F2< 9>(D1,E1,A1,B1,C1,m_M[ 5]+MAGIC2);  F4< 7>(D2,E2,A2,B2,C2,m_M[12]+MAGIC7);
      F2<11>(C1,D1,E1,A1,B1,m_M[ 2]+MAGIC2);  F4< 6>(C2,D2,E2,A2,B2,m_M[ 4]+MAGIC7);
      F2< 7>(B1,C1,D1,E1,A1,m_M[14]+MAGIC2);  F4<15>(B2,C2,D2,E2,A2,m_M[ 9]+MAGIC7);
      F2<13>(A1,B1,C1,D1,E1,m_M[11]+MAGIC2);  F4<13>(A2,B2,C2,D2,E2,m_M[ 1]+MAGIC7);
      F2<12>(E1,A1,B1,C1,D1,m_M[ 8]+MAGIC2);  F4<11>(E2,A2,B2,C2,D2,m_M[ 2]+MAGIC7);

      F3<11>(D1,E1,A1,B1,C1,m_M[ 3]+MAGIC3);  F3< 9>(D2,E2,A2,B2,C2,m_M[15]+MAGIC8);
      F3<13>(C1,D1,E1,A1,B1,m_M[10]+MAGIC3);  F3< 7>(C2,D2,E2,A2,B2,m_M[ 5]+MAGIC8);
      F3< 6>(B1,C1,D1,E1,A1,m_M[14]+MAGIC3);  F3<15>(B2,C2,D2,E2,A2,m_M[ 1]+MAGIC8);
      F3< 7>(A1,B1,C1,D1,E1,m_M[ 4]+MAGIC3);  F3<11>(A2,B2,C2,D2,E2,m_M[ 3]+MAGIC8);
      F3<14>(E1,A1,B1,C1,D1,m_M[ 9]+MAGIC3);  F3< 8>(E2,A2,B2,C2,D2,m_M[ 7]+MAGIC8);
      F3< 9>(D1,E1,A1,B1,C1,m_M[15]+MAGIC3);  F3< 6>(D2,E2,A2,B2,C2,m_M[14]+MAGIC8);
      F3<13>(C1,D1,E1,A1,B1,m_M[ 8]+MAGIC3);  F3< 6>(C2,D2,E2,A2,B2,m_M[ 6]+MAGIC8);
      F3<15>(B1,C1,D1,E1,A1,m_M[ 1]+MAGIC3);  F3<14>(B2,C2,D2,E2,A2,m_M[ 9]+MAGIC8);
      F3<14>(A1,B1,C1,D1,E1,m_M[ 2]+MAGIC3);  F3<12>(A2,B2,C2,D2,E2,m_M[11]+MAGIC8);
      F3< 8>(E1,A1,B1,C1,D1,m_M[ 7]+MAGIC3);  F3<13>(E2,A2,B2,C2,D2,m_M[ 8]+MAGIC8);
      F3<13>(D1,E1,A1,B1,C1,m_M[ 0]+MAGIC3);  F3< 5>(D2,E2,A2,B2,C2,m_M[12]+MAGIC8);
      F3< 6>(C1,D1,E1,A1,B1,m_M[ 6]+MAGIC3);  F3<14>(C2,D2,E2,A2,B2,m_M[ 2]+MAGIC8);
      F3< 5>(B1,C1,D1,E1,A1,m_M[13]+MAGIC3);  F3<13>(B2,C2,D2,E2,A2,m_M[10]+MAGIC8);
      F3<12>(A1,B1,C1,D1,E1,m_M[11]+MAGIC3);  F3<13>(A2,B2,C2,D2,E2,m_M[ 0]+MAGIC8);
      F3< 7>(E1,A1,B1,C1,D1,m_M[ 5]+MAGIC3);  F3< 7>(E2,A2,B2,C2,D2,m_M[ 4]+MAGIC8);
      F3< 5>(D1,E1,A1,B1,C1,m_M[12]+MAGIC3);  F3< 5>(D2,E2,A2,B2,C2,m_M[13]+MAGIC8);

      F4<11>(C1,D1,E1,A1,B1,m_M[ 1]+MAGIC4);  F2<15>(C2,D2,E2,A2,B2,m_M[ 8]+MAGIC9);
      F4<12>(B1,C1,D1,E1,A1,m_M[ 9]+MAGIC4);  F2< 5>(B2,C2,D2,E2,A2,m_M[ 6]+MAGIC9);
      F4<14>(A1,B1,C1,D1,E1,m_M[11]+MAGIC4);  F2< 8>(A2,B2,C2,D2,E2,m_M[ 4]+MAGIC9);
      F4<15>(E1,A1,B1,C1,D1,m_M[10]+MAGIC4);  F2<11>(E2,A2,B2,C2,D2,m_M[ 1]+MAGIC9);
      F4<14>(D1,E1,A1,B1,C1,m_M[ 0]+MAGIC4);  F2<14>(D2,E2,A2,B2,C2,m_M[ 3]+MAGIC9);
      F4<15>(C1,D1,E1,A1,B1,m_M[ 8]+MAGIC4);  F2<14>(C2,D2,E2,A2,B2,m_M[11]+MAGIC9);
      F4< 9>(B1,C1,D1,E1,A1,m_M[12]+MAGIC4);  F2< 6>(B2,C2,D2,E2,A2,m_M[15]+MAGIC9);
      F4< 8>(A1,B1,C1,D1,E1,m_M[ 4]+MAGIC4);  F2<14>(A2,B2,C2,D2,E2,m_M[ 0]+MAGIC9);
      F4< 9>(E1,A1,B1,C1,D1,m_M[13]+MAGIC4);  F2< 6>(E2,A2,B2,C2,D2,m_M[ 5]+MAGIC9);
      F4<14>(D1,E1,A1,B1,C1,m_M[ 3]+MAGIC4);  F2< 9>(D2,E2,A2,B2,C2,m_M[12]+MAGIC9);
      F4< 5>(C1,D1,E1,A1,B1,m_M[ 7]+MAGIC4);  F2<12>(C2,D2,E2,A2,B2,m_M[ 2]+MAGIC9);
      F4< 6>(B1,C1,D1,E1,A1,m_M[15]+MAGIC4);  F2< 9>(B2,C2,D2,E2,A2,m_M[13]+MAGIC9);
      F4< 8>(A1,B1,C1,D1,E1,m_M[14]+MAGIC4);  F2<12>(A2,B2,C2,D2,E2,m_M[ 9]+MAGIC9);
      F4< 6>(E1,A1,B1,C1,D1,m_M[ 5]+MAGIC4);  F2< 5>(E2,A2,B2,C2,D2,m_M[ 7]+MAGIC9);
      F4< 5>(D1,E1,A1,B1,C1,m_M[ 6]+MAGIC4);  F2<15>(D2,E2,A2,B2,C2,m_M[10]+MAGIC9);
      F4<12>(C1,D1,E1,A1,B1,m_M[ 2]+MAGIC4);  F2< 8>(C2,D2,E2,A2,B2,m_M[14]+MAGIC9);

      F5< 9>(B1,C1,D1,E1,A1,m_M[ 4]+MAGIC5);  F1< 8>(B2,C2,D2,E2,A2,m_M[12]       );
      F5<15>(A1,B1,C1,D1,E1,m_M[ 0]+MAGIC5);  F1< 5>(A2,B2,C2,D2,E2,m_M[15]       );
      F5< 5>(E1,A1,B1,C1,D1,m_M[ 5]+MAGIC5);  F1<12>(E2,A2,B2,C2,D2,m_M[10]       );
      F5<11>(D1,E1,A1,B1,C1,m_M[ 9]+MAGIC5);  F1< 9>(D2,E2,A2,B2,C2,m_M[ 4]       );
      F5< 6>(C1,D1,E1,A1,B1,m_M[ 7]+MAGIC5);  F1<12>(C2,D2,E2,A2,B2,m_M[ 1]       );
      F5< 8>(B1,C1,D1,E1,A1,m_M[12]+MAGIC5);  F1< 5>(B2,C2,D2,E2,A2,m_M[ 5]       );
      F5<13>(A1,B1,C1,D1,E1,m_M[ 2]+MAGIC5);  F1<14>(A2,B2,C2,D2,E2,m_M[ 8]       );
      F5<12>(E1,A1,B1,C1,D1,m_M[10]+MAGIC5);  F1< 6>(E2,A2,B2,C2,D2,m_M[ 7]       );
      F5< 5>(D1,E1,A1,B1,C1,m_M[14]+MAGIC5);  F1< 8>(D2,E2,A2,B2,C2,m_M[ 6]       );
      F5<12>(C1,D1,E1,A1,B1,m_M[ 1]+MAGIC5);  F1<13>(C2,D2,E2,A2,B2,m_M[ 2]       );
      F5<13>(B1,C1,D1,E1,A1,m_M[ 3]+MAGIC5);  F1< 6>(B2,C2,D2,E2,A2,m_M[13]       );
      F5<14>(A1,B1,C1,D1,E1,m_M[ 8]+MAGIC5);  F1< 5>(A2,B2,C2,D2,E2,m_M[14]       );
      F5<11>(E1,A1,B1,C1,D1,m_M[11]+MAGIC5);  F1<15>(E2,A2,B2,C2,D2,m_M[ 0]       );
      F5< 8>(D1,E1,A1,B1,C1,m_M[ 6]+MAGIC5);  F1<13>(D2,E2,A2,B2,C2,m_M[ 3]       );
      F5< 5>(C1,D1,E1,A1,B1,m_M[15]+MAGIC5);  F1<11>(C2,D2,E2,A2,B2,m_M[ 9]       );
      F5< 6>(B1,C1,D1,E1,A1,m_M[13]+MAGIC5);  F1<11>(B2,C2,D2,E2,A2,m_M[11]       );

      C1          = m_digest[1] + C1 + D2;
      m_digest[1] = m_digest[2] + D1 + E2;
      m_digest[2] = m_digest[3] + E1 + A2;
      m_digest[3] = m_digest[4] + A1 + B2;
      m_digest[4] = m_digest[0] + B1 + C2;
      m_digest[0] = C1;

      input += hash_block_size();
      }
   }

/*
* Copy out the digest
*/
void RIPEMD_160::copy_out(uint8_t output[])
   {
   copy_out_vec_le(output, output_length(), m_digest);
   }

/*
* Clear memory of sensitive data
*/
void RIPEMD_160::clear()
   {
   MDx_HashFunction::clear();
   zeroise(m_M);
   m_digest[0] = 0x67452301;
   m_digest[1] = 0xEFCDAB89;
   m_digest[2] = 0x98BADCFE;
   m_digest[3] = 0x10325476;
   m_digest[4] = 0xC3D2E1F0;
   }

}
