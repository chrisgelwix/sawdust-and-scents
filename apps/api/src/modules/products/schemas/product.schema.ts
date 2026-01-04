import { 
    Prop,
    Schema,
    SchemaFactory
} from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Product extends Document {
    @Prop({ required: true }) 
    name!: string;

    @Prop()
    description!: string;

    @Prop({ required: true })
    price!: number;

    @Prop({ required: true })
    category!: string;

    @Prop({ type: Object })
    attributes!: Record<string, unknown>;

    @Prop({ default: true})
    isActive!: boolean;
}

export const ProductSchema = 
    SchemaFactory.createForClass(Product);