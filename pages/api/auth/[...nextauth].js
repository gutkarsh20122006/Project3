const NextAuth = require('next-auth');
const CredentialsProvider = require('next-auth/providers/credentials');
const bcrypt = require('bcryptjs');
const { prisma } = require('../../../lib/prisma');

const secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

const authOptions = {
  secret,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/signup',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, hashedPassword: true },
        });

        if (!user || !user.hashedPassword) {
          throw new Error('Invalid email or password');
        }

        const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!valid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // eslint-disable-next-line no-console
      console.info(`User signed in: ${user.email || user.id}`);
    },
  },
};

module.exports = NextAuth(authOptions);
module.exports.authOptions = authOptions;
