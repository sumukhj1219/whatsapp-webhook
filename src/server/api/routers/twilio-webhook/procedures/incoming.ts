import z from "zod";
import { publicProcedure } from "~/server/api/trpc";

export const incoming = publicProcedure
    .input(z.object({
        from: z.string(),
        to: z.string(),
        messageBody: z.string(),
        numMedia: z.number().default(0),
        profileName: z.string()
    })).mutation(async ({ctx, input}) => { 
        let mediaUrls = []
        if (input.numMedia > 0){
            for(let i=0; i<input.numMedia; i++){
                mediaUrls.push()
            }
        }
    })