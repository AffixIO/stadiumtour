"""Synthetic Merkle tree primitives for the arena simulation.

Credit: @paparichens
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@dataclass(slots=True)
class MerkleProof:
    leaf: str
    root: str
    path: list[tuple[str, str]]


def build_merkle_root(leaves: list[str]) -> str:
    if not leaves:
        return sha256_hex("empty")
    layer = leaves[:]
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])
        next_layer: list[str] = []
        for i in range(0, len(layer), 2):
            next_layer.append(sha256_hex(layer[i] + layer[i + 1]))
        layer = next_layer
    return layer[0]


def generate_proof(leaves: list[str], leaf: str) -> MerkleProof:
    if leaf not in leaves:
        raise ValueError("leaf not in tree")
    index = leaves.index(leaf)
    path: list[tuple[str, str]] = []
    layer = leaves[:]
    idx = index
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])
        sibling_idx = idx - 1 if idx % 2 else idx + 1
        sibling = layer[sibling_idx]
        direction = "left" if sibling_idx < idx else "right"
        path.append((direction, sibling))
        next_layer: list[str] = []
        for i in range(0, len(layer), 2):
            next_layer.append(sha256_hex(layer[i] + layer[i + 1]))
        idx //= 2
        layer = next_layer
    return MerkleProof(leaf=leaf, root=layer[0], path=path)


def verify_proof(leaf: str, proof_path: list[tuple[str, str]], root: str) -> bool:
    current = leaf
    for direction, sibling in proof_path:
        if direction == "left":
            current = sha256_hex(sibling + current)
        else:
            current = sha256_hex(current + sibling)
    return current == root
