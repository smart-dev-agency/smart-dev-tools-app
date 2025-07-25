declare module 'node-forge' {
  export = forge;
  
  namespace forge {
    namespace pki {
      interface Certificate {
        subject: {
          attributes: Array<{
            type: string;
            value: string;
          }>;
        };
        issuer: {
          attributes: Array<{
            type: string;
            value: string;
          }>;
        };
        serialNumber: string;
        version: number;
        validity: {
          notBefore: Date;
          notAfter: Date;
        };
        publicKey: any;
        extensions?: Array<{
          id: string;
          critical?: boolean;
          value?: any;
          [key: string]: any;
        }>;
        siginfo?: {
          algorithmOid?: string;
        };
      }
      
      function certificateFromPem(pem: string): Certificate;
      function certificateFromAsn1(asn1: any): Certificate;
      function certificateToAsn1(cert: Certificate): any;
      
      namespace rsa {
        interface PublicKey {
          n: {
            bitLength(): number;
          };
        }
      }
      
      namespace oids {
        const commonName: string;
        const countryName: string;
        const localityName: string;
        const stateOrProvinceName: string;
        const organizationName: string;
        const organizationalUnitName: string;
        const emailAddress: string;
        const keyUsage: string;
        const extKeyUsage: string;
        const subjectAltName: string;
        const basicConstraints: string;
        const authorityKeyIdentifier: string;
        const subjectKeyIdentifier: string;
        const cRLDistributionPoints: string;
        const authorityInfoAccess: string;
        const certificatePolicies: string;
      }
    }
    
    namespace asn1 {
      function fromDer(der: string): any;
      function toDer(asn1: any): {
        getBytes(): string;
      };
    }
    
    namespace util {
      function decode64(encoded: string): string;
      function bytesToHex(bytes: string): string;
    }
    
    namespace md {
      namespace sha256 {
        function create(): {
          update(data: string): any;
          digest(): {
            toHex(): string;
          };
        };
      }
      
      namespace sha1 {
        function create(): {
          update(data: string): any;
          digest(): {
            toHex(): string;
          };
        };
      }
      
      namespace md5 {
        function create(): {
          update(data: string): any;
          digest(): {
            toHex(): string;
          };
        };
      }
    }
  }
}
