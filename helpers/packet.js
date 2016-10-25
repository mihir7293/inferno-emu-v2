/*
 * packet.js - Contains all packet definitions and helper functions
 */

'use strict';

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');

const PREPARE_USER = 'prepare-user';
const SELECT_CHARACTER = 'select-character';
const DELETE_CHARACTER = 'delete-character';
const DESTROY_USER = 'destroy-user';
const WORLD_ENTER = 'world-enter';

module.exports = {
  /**
   * Identifiers are used to identify the packet received from client
   * @type {Object}
   */
  identifier: {
    login: {
      len: {
        USER_CREDENTIALS: 56,
        GAME_SERVER_DETAILS_REQUEST: 11
      }
    },
    game: {
      type: {
        PREPARE_USER: PREPARE_USER,
        SELECT_CHARACTER: SELECT_CHARACTER,
        DELETE_CHARACTER: DELETE_CHARACTER,
        DESTROY_USER: DESTROY_USER,
        WORLD_ENTER: WORLD_ENTER
      }
    }
  },
  helper: {
    /**
     * Returns pre login message packet buffer
     * @param  {string} msg The message that has to be displayed
     * @return {Buffer}     Packet buffer
     */
    getPreLoginMessagePacket: function (msg) {
      var packet = [0x5c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xe0, 0x01];
      if (msg.length > 70) {
        msg = msg.substr(0, 69);
      }
      var toFill = 92 - 11 - msg.length;
      for (var i = 0; i < msg.length; i++) {
        packet.push(msg.charAt(i).charCodeAt(0));
      }
      for (var j = 0; j < toFill; j++) {
        packet.push(0x00);
      }
      return new Buffer(packet);
    },
    /**
     * Returns username and password from the given buffer
     * @param data
     * @param usernameStartIndex
     * @param passwordStartIndex
     * @return {object}  Credential object
     */
    getParsedCredentials: function (data, usernameStartIndex, passwordStartIndex) {
      var stringData = decoder.end(data);
      var temp1 = stringData.substr(usernameStartIndex, 20).trim();
      var temp2 = stringData.substr(passwordStartIndex, 20).trim();
      var username = '', password = '';
      for (var i = 0; i < temp1.length; i++) {
        var code = temp1.charCodeAt(i);
        if (!this.escapeNonAlphNumeric(code)) { // lower alpha (a-z)
          break;
        }
        username += temp1.charAt(i);
      }
      for (var i = 0; i < temp2.length; i++) {
        var code = temp2.charCodeAt(i);
        if (!this.escapeNonAlphNumeric(code)) { // lower alpha (a-z)
          break;
        }
        password += temp2.charAt(i);
      }
      return {
        username: username,
        password: password
      };
    },
    /**
     * Returns whether a char is alpha numeric
     * @param charCode
     * @returns {boolean}
     */
    escapeNonAlphNumeric: function (charCode) {
      if (!(charCode > 47 && charCode < 58) && // numeric (0-9)
        !(charCode > 64 && charCode < 91) && // upper alpha (A-Z)
        !(charCode > 96 && charCode < 123)) { // lower alpha (a-z)
        return false
      }
      return true;
    },
    /**
     * Returns packet with server details
     * @param ip
     * @param port
     * @returns {Buffer}
     */
    getServerDetailsPacket: function (ip, port) {
      var packet = [0x22, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xe2, 0x11, 0x38, 0x54, 0x00];
      var toFill = 16 - ip.length;
      for (var i = 0; i < ip.length; i++) {
        packet.push(ip.charAt(i).charCodeAt(0));
      }
      for (var j = 0; j < toFill; j++) {
        packet.push(0x00);
      }
      var portHexString = port.toString(16);
      while (portHexString.length < 4) {
        portHexString = "0" + portHexString;
      }
      packet.push(parseInt(portHexString.substr(2, 2), 16));
      packet.push(parseInt(portHexString.substr(0, 2), 16));
      packet.push(0x00);
      packet.push(0x00);
      return new Buffer(packet);
    },
    /**
     * Validates packet size with given packet size
     * @param packet
     * @param length
     * @returns {boolean}
     */
    validatePacketSize: function (packet, length) {
      return this.intFromBytes(packet) == length;
    },
    /**
     * Returns integer value from reverse hex byte
     * @param packet
     * @returns {number}
     */
    intFromBytes: function (packet) {
      var val = 0;
      packet = packet.slice(0, 2).reverse();
      for (var i = 0; i < packet.length; ++i) {
        val += packet[i];
        if (i < packet.length - 1) {
          val = val << 8;
        }
      }
      return val;
    },
    /**
     * Returns reverse hex byte from an integer
     * @param num
     * @returns {Array.<*>}
     */
    toBytesInt32: function (num) {
      var arr = [
        (num & 0xff000000) >> 24,
        (num & 0x00ff0000) >> 16,
        (num & 0x0000ff00) >> 8,
        (num & 0x000000ff)
      ];
      return arr.reverse();
    },
    /**
     * Returns server welcome message
     * @param serverName
     * @returns {Buffer}
     */
    getServerWelcomeMessagePacket: function (serverName) {
      var packet = [0x5c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xe3, 0x01];
      var welcomeMsg = "Welcome to server " + serverName;
      if (welcomeMsg.Length > 61) {
        welcomeMsg = welcomeMsg.substr(0, 61);
      }
      if (serverName.Length > 13) {
        serverName = serverName.substr(0, 13);
      }
      for (var i = 0; i < welcomeMsg.length; i++) {
        packet.push(welcomeMsg.charAt(i).charCodeAt(0));
      }
      for (var i = 0; i < 63 - welcomeMsg.length; i++) {
        packet.push(0x00);
      }
      packet = packet.concat([
        0x4c, 0x27, 0xd3, 0x77, 0xe4, 0x03, 0x01, 0xf5, 0x21, 0x00, 0x00, 0x00, 0x14, 0x00,
        0x00, 0x00, 0xe4, 0x03, 0x6f, 0x00, 0x00, 0x00, 0x01, 0x4f, 0x00, 0x00, 0x01, 0xe1,
        0x01, 0x00, 0x00
      ]);
      for (var i = 0; i < serverName.length; i++) {
        packet.push(serverName.charAt(i).charCodeAt(0));
      }
      for (var i = 0; i < 13 - serverName.length; i++) {
        packet.push(0x00);
      }
      packet = packet.concat([0x68, 0x00, 0x00, 0x00]);
      for (var i = 0; i < "ONLINE".length; i++) {
        packet.push("ONLINE".charAt(i).charCodeAt(0));
      }
      for (var i = 0; i < 75; i++) {
        packet.push(0x00);
      }
      return new Buffer(packet);
    },
    /**
     * Returns the type of packet received by the game server
     * @param packet
     * @returns {string}
     */
    getGameServerPacketType: function (packet) {
      var type = '';
      switch (packet.length) {
        case 56:
          type = PREPARE_USER;
          break;
        case 12:
          type = DESTROY_USER;
          break;
        case 33:
          if (packet[8] == 0x03 && packet[9] == 0xff && packet[10] == 0x02 && packet[11] == 0xa0) {
            type = DELETE_CHARACTER;
          } else {
            type = WORLD_ENTER;
          }
          break;
        case 37:
          type = SELECT_CHARACTER;
          break;
      }
      return type;
    },
    /**
     * Returns message that can be shown post login
     * @param message
     * @returns {Buffer}
     */
    getPostLoginMessagePacket: function (message) {
      var packet = [0x4e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0b, 0x00, 0x03, 0xff, 0xff, 0x0f, 0x7e, 0x2f, 0x6e, 0x33];
      if (message.length > 56) {
        message = message.substr(0, 56);
      }
      for (var i = 0; i < message.length; i++) {
        packet.push(message.charAt(i).charCodeAt(0));
      }
      for (var i = 0; i < 62 - message.length; i++) {
        packet.push(0x00);
      }
      return new Buffer(packet, 'base64');
    },
    /**
     * Returns character name from packet
     * @param packet
     * @returns {string}
     */
    getCharacterName: function (packet) {
      var stringData = decoder.end(packet);
      var temp1 = stringData.substr(12, 12).trim();
      var charName = '';
      for (var i = 0; i < temp1.length; i++) {
        var code = temp1.charCodeAt(i);
        if (!this.escapeNonAlphNumeric(code)) {
          break;
        }
        charName += temp1.charAt(i);
      }
      return charName;
    }
  }
};
