// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentRegistry {

    struct Document {
        address owner;
        uint256 timestamp;
    }

    mapping(bytes32 => Document) private documents;
    mapping(address => bytes32[]) private ownerDocuments;

    event DocumentRegistered(
        bytes32 hash,
        address owner,
        uint256 timestamp
    );

    function registerDocument(bytes32 hash) public {
        require(documents[hash].timestamp == 0, "Document already registered");

        documents[hash] = Document({
            owner: msg.sender,
            timestamp: block.timestamp
        });

        ownerDocuments[msg.sender].push(hash);

        emit DocumentRegistered(hash, msg.sender, block.timestamp);
    }

    function verifyDocument(bytes32 hash)
        public
        view
        returns (address owner, uint256 timestamp)
    {
        require(documents[hash].timestamp != 0, "Document not found");

        Document memory doc = documents[hash];
        return (doc.owner, doc.timestamp);
    }

    function getDocumentsByOwner(address owner)
        public
        view
        returns (bytes32[] memory)
    {
        return ownerDocuments[owner];
    }
}