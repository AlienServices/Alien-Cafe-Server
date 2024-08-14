import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json();
    console.log(data, "update user data");

    try {
        const { userEmail, followUserEmail } = data;

        // Fetch the user being followed
        const followUser = await prisma.user.findUnique({
            where: {
                email: followUserEmail ? followUserEmail : ''
            },
            select: {
                followers: true
            }
        });

        if (!followUser) {
            return NextResponse.json({ error: 'User to follow not found' }, { status: 404 });
        }

        // Fetch the current user
        const currentUser = await prisma.user.findUnique({
            where: {
                email: userEmail ? userEmail : ''
            },
            select: {
                following: true
            }
        });

        if (!currentUser) {
            return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
        }

        // Ensure the user's email is not already in the followers array
        const updatedFollowers = followUser.followers && !followUser.followers.includes(userEmail) 
            ? [...followUser.followers, userEmail] 
            : followUser.followers;

        // Ensure the followUserEmail is not already in the following array
        const updatedFollowing = currentUser.following && !currentUser.following.includes(followUserEmail) 
            ? [...currentUser.following, followUserEmail] 
            : currentUser.following;

        // Perform the updates
        const [updatedFollowUser, updatedCurrentUser] = await prisma.$transaction([
            prisma.user.update({
                where: {
                    email: followUserEmail
                },
                data: {
                    followers: updatedFollowers
                }
            }),
            prisma.user.update({
                where: {
                    email: userEmail
                },
                data: {
                    following: updatedFollowing
                }
            })
        ]);

        return NextResponse.json({
            updatedFollowUser,
            updatedCurrentUser
        });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}