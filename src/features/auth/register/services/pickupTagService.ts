import { z } from 'zod';

const pickupTagsResponseSchema = z.object({
  tags: z.array(z.object({
    tag_identifier: z.string().uuid(),
    tag_name: z.string().min(1),
  })),
});

export type PickupTag = {
  identifier: string;
  label: string;
};

export async function getPickupTags(): Promise<PickupTag[]> {
  const response = await fetch('/api/tags/pickup');
  if (!response.ok) {
    throw new Error('Pickup tags could not be loaded.');
  }

  return pickupTagsResponseSchema.parse(await response.json()).tags.map((tag) => ({
    identifier: tag.tag_identifier,
    label: tag.tag_name,
  }));
}
