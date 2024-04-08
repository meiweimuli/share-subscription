package aliyun

import (
	"crypto/ecdsa"
	"encoding/hex"
	"github.com/dustinxie/ecc"
	"math/big"
)

func newPrivateKeyFromHex(hex_ string) (*ecdsa.PrivateKey, error) {
	data, err := hex.DecodeString(hex_)
	if err != nil {
		return nil, err
	}
	return newPrivateKeyFromBytes(data), nil

}

func newPrivateKeyFromBytes(priv []byte) *ecdsa.PrivateKey {
	p256k1 := ecc.P256k1()
	x, y := p256k1.ScalarBaseMult(priv)
	return &ecdsa.PrivateKey{
		PublicKey: ecdsa.PublicKey{
			Curve: p256k1,
			X:     x,
			Y:     y,
		},
		D: new(big.Int).SetBytes(priv),
	}
}

func publicKeyToHex(public *ecdsa.PublicKey) string {
	return hex.EncodeToString(publicKeyToBytes(public))
}

func publicKeyToBytes(public *ecdsa.PublicKey) []byte {
	x := public.X.Bytes()
	if len(x) < 32 {
		for i := 0; i < 32-len(x); i++ {
			x = append([]byte{0}, x...)
		}
	}

	y := public.Y.Bytes()
	if len(y) < 32 {
		for i := 0; i < 32-len(y); i++ {
			y = append([]byte{0}, y...)
		}
	}
	return append(x, y...)
}
