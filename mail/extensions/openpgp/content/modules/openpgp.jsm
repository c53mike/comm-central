/*
 * This Source Code Form is licensed under the GNU LGPL 3.0 license.
 *
 */

"use strict";

/**
 * This code is taken from openpgp.js
 *
 * Do OpenPGP packet parsing
 */

/* eslint no-invalid-this: 0 */

var EXPORTED_SYMBOLS = ["EnigmailOpenPGP"];

var crc_table = [0x00000000, 0x00864cfb, 0x018ad50d, 0x010c99f6, 0x0393e6e1, 0x0315aa1a, 0x021933ec, 0x029f7f17, 0x07a18139, 0x0727cdc2, 0x062b5434, 0x06ad18cf, 0x043267d8, 0x04b42b23,
  0x05b8b2d5, 0x053efe2e, 0x0fc54e89, 0x0f430272, 0x0e4f9b84, 0x0ec9d77f, 0x0c56a868, 0x0cd0e493, 0x0ddc7d65, 0x0d5a319e, 0x0864cfb0, 0x08e2834b, 0x09ee1abd, 0x09685646, 0x0bf72951,
  0x0b7165aa, 0x0a7dfc5c, 0x0afbb0a7, 0x1f0cd1e9, 0x1f8a9d12, 0x1e8604e4, 0x1e00481f, 0x1c9f3708, 0x1c197bf3, 0x1d15e205, 0x1d93aefe, 0x18ad50d0, 0x182b1c2b, 0x192785dd, 0x19a1c926,
  0x1b3eb631, 0x1bb8faca, 0x1ab4633c, 0x1a322fc7, 0x10c99f60, 0x104fd39b, 0x11434a6d, 0x11c50696, 0x135a7981, 0x13dc357a, 0x12d0ac8c, 0x1256e077, 0x17681e59, 0x17ee52a2, 0x16e2cb54,
  0x166487af, 0x14fbf8b8, 0x147db443, 0x15712db5, 0x15f7614e, 0x3e19a3d2, 0x3e9fef29, 0x3f9376df, 0x3f153a24, 0x3d8a4533, 0x3d0c09c8, 0x3c00903e, 0x3c86dcc5, 0x39b822eb, 0x393e6e10,
  0x3832f7e6, 0x38b4bb1d, 0x3a2bc40a, 0x3aad88f1, 0x3ba11107, 0x3b275dfc, 0x31dced5b, 0x315aa1a0, 0x30563856, 0x30d074ad, 0x324f0bba, 0x32c94741, 0x33c5deb7, 0x3343924c, 0x367d6c62,
  0x36fb2099, 0x37f7b96f, 0x3771f594, 0x35ee8a83, 0x3568c678, 0x34645f8e, 0x34e21375, 0x2115723b, 0x21933ec0, 0x209fa736, 0x2019ebcd, 0x228694da, 0x2200d821, 0x230c41d7, 0x238a0d2c,
  0x26b4f302, 0x2632bff9, 0x273e260f, 0x27b86af4, 0x252715e3, 0x25a15918, 0x24adc0ee, 0x242b8c15, 0x2ed03cb2, 0x2e567049, 0x2f5ae9bf, 0x2fdca544, 0x2d43da53, 0x2dc596a8, 0x2cc90f5e,
  0x2c4f43a5, 0x2971bd8b, 0x29f7f170, 0x28fb6886, 0x287d247d, 0x2ae25b6a, 0x2a641791, 0x2b688e67, 0x2beec29c, 0x7c3347a4, 0x7cb50b5f, 0x7db992a9, 0x7d3fde52, 0x7fa0a145, 0x7f26edbe,
  0x7e2a7448, 0x7eac38b3, 0x7b92c69d, 0x7b148a66, 0x7a181390, 0x7a9e5f6b, 0x7801207c, 0x78876c87, 0x798bf571, 0x790db98a, 0x73f6092d, 0x737045d6, 0x727cdc20, 0x72fa90db, 0x7065efcc,
  0x70e3a337, 0x71ef3ac1, 0x7169763a, 0x74578814, 0x74d1c4ef, 0x75dd5d19, 0x755b11e2, 0x77c46ef5, 0x7742220e, 0x764ebbf8, 0x76c8f703, 0x633f964d, 0x63b9dab6, 0x62b54340, 0x62330fbb,
  0x60ac70ac, 0x602a3c57, 0x6126a5a1, 0x61a0e95a, 0x649e1774, 0x64185b8f, 0x6514c279, 0x65928e82, 0x670df195, 0x678bbd6e, 0x66872498, 0x66016863, 0x6cfad8c4, 0x6c7c943f, 0x6d700dc9,
  0x6df64132, 0x6f693e25, 0x6fef72de, 0x6ee3eb28, 0x6e65a7d3, 0x6b5b59fd, 0x6bdd1506, 0x6ad18cf0, 0x6a57c00b, 0x68c8bf1c, 0x684ef3e7, 0x69426a11, 0x69c426ea, 0x422ae476, 0x42aca88d,
  0x43a0317b, 0x43267d80, 0x41b90297, 0x413f4e6c, 0x4033d79a, 0x40b59b61, 0x458b654f, 0x450d29b4, 0x4401b042, 0x4487fcb9, 0x461883ae, 0x469ecf55, 0x479256a3, 0x47141a58, 0x4defaaff,
  0x4d69e604, 0x4c657ff2, 0x4ce33309, 0x4e7c4c1e, 0x4efa00e5, 0x4ff69913, 0x4f70d5e8, 0x4a4e2bc6, 0x4ac8673d, 0x4bc4fecb, 0x4b42b230, 0x49ddcd27, 0x495b81dc, 0x4857182a, 0x48d154d1,
  0x5d26359f, 0x5da07964, 0x5cace092, 0x5c2aac69, 0x5eb5d37e, 0x5e339f85, 0x5f3f0673, 0x5fb94a88, 0x5a87b4a6, 0x5a01f85d, 0x5b0d61ab, 0x5b8b2d50, 0x59145247, 0x59921ebc, 0x589e874a,
  0x5818cbb1, 0x52e37b16, 0x526537ed, 0x5369ae1b, 0x53efe2e0, 0x51709df7, 0x51f6d10c, 0x50fa48fa, 0x507c0401, 0x5542fa2f, 0x55c4b6d4, 0x54c82f22, 0x544e63d9, 0x56d11cce, 0x56575035,
  0x575bc9c3, 0x57dd8538
];

function initialize() {
  const EnigmailLog = ChromeUtils.import("chrome://openpgp/content/modules/log.jsm").EnigmailLog;

  EnigmailLog.DEBUG("openpgp.jsm: initialize()\n");

}

var EnigmailOpenPGP = {
  get openpgp() {
    if (!gOpenPGPLib) {
      initialize();
    }

    return gOpenPGPLib;
  },

  armor: {
    multipart_section: 0,
    multipart_last: 1,
    signed: 2,
    message: 3,
    public_key: 4,
    private_key: 5,
    signature: 6
  },


  enigmailFuncs: {

    /**
     * Convert a string to an Uint8Array
     *
     * @param  str: String with binary data
     * @return Uint8Array
     */
    str2Uint8Array: function(str) {
      var buf = new ArrayBuffer(str.length);
      var bufView = new Uint8Array(buf);
      for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return bufView;
    },

    /**
     * Create CRC24 checksum
     *
     * @param input: Uint8Array of input data
     *
     * @return Number
     */
    createcrc24: function(input) {
      var crc = 0xB704CE;
      var index = 0;

      while (input.length - index > 16) {
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 1]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 2]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 3]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 4]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 5]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 6]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 7]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 8]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 9]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 10]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 11]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 12]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 13]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 14]) & 0xff];
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index + 15]) & 0xff];
        index += 16;
      }

      for (var j = index; j < input.length; j++) {
        crc = crc << 8 ^ crc_table[(crc >> 16 ^ input[index++]) & 0xff];
      }
      return crc & 0xffffff;
    },

    /**
     * Create an ASCII armored string from binary data. The message data is NOT
     * checked for correctness, only the CRC is added at the end.
     *
     * @param msgType: Number - type of OpenPGP message to create (ARMOR Enum)
     * @param str:     String - binary OpenPGP message
     *
     * @return String: ASCII armored OpenPGP message
     */
    bytesToArmor: function(msgType, str) {

      const ARMOR_TYPE = EnigmailOpenPGP.armor;

      let hdr = "";
      switch (msgType) {
        case ARMOR_TYPE.signed:
        case ARMOR_TYPE.message:
          hdr = "MESSAGE";
          break;
        case ARMOR_TYPE.public_key:
          hdr = "PUBLIC KEY BLOCK";
          break;
        case ARMOR_TYPE.private_key:
          hdr = "PRIVATE KEY BLOCK";
          break;
        case ARMOR_TYPE.signature:
          hdr = "SIGNATURE";
          break;
      }

      let crc = EnigmailOpenPGP.enigmailFuncs.createcrc24(EnigmailOpenPGP.enigmailFuncs.str2Uint8Array(str));
      let crcAsc = String.fromCharCode(crc >> 16) + String.fromCharCode(crc >> 8 & 0xFF) + String.fromCharCode(crc & 0xFF);

      let s = "-----BEGIN PGP " + hdr + "-----\n\n" +
        btoa(str).replace(/(.{72})/g, "$1\n") + "\n" +
        "=" + btoa(crcAsc) + "\n" +
        "-----END PGP " + hdr + "-----\n";

      return s;
    }
  }
};
