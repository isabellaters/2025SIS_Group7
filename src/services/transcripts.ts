
import type { Transcript } from "../types/transcript";
import { addDoc, doc, collection, Timestamp, updateDoc, getDoc} from "firebase/firestore";
import { db } from "./firebase";

// DB Name
const COLLECTION_NAME = "transcripts";
const collectionRef = collection(db, COLLECTION_NAME);


export const createTranscript = async (data: Transcript) : Promise<string> => {
    try {
        const currentTime = Timestamp.now();
        const transcript: Omit<Transcript, 'id'> = {
            ...data,
            status: data.status || 'processing',
            createdAt: currentTime,
            updatedAt: currentTime,
        };
        // const collectionRef = collection(db, COLLECTION_NAME);
        const docRef = await addDoc(collectionRef, transcript);
        return docRef.id;
    }
    catch (error) {
        console.error("Error creating transcript: ", error);
        throw new Error('Failed to create transcript');
    };
}

export const findTranscript = async (id:string) : Promise<Transcript | null> => {
    try {
        const docRef = doc(collectionRef, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data(),
            } as Transcript;
        }
        return null;

    } catch (error) {
        console.log("Error while finding transcript", error);
        throw new Error('Failed to create transcript');
    }


}

export const updateTranscript = async (id: string, data: Partial<Transcript>) : Promise<void> => {
    try {

        const transcript = {
            ...data,
            updateAt: Timestamp.now(),
        };

        const docRef = doc(collectionRef, id);
        await updateDoc(docRef, transcript);

    } catch (error) {
        console.log("Error while updating transcript:", error);
    }
}

// export class TranscriptService {

//     async updateTranscript(data: Transcript)
    
//     async createTranscript(input: Transcript): Promise<string> {
//         return "hello world";
//     }

// }