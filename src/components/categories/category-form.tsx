
'use client';

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Category } from '@/lib/types';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, { message: 'نام دسته‌بندی باید حداقل ۲ حرف داشته باشد.' }),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: CategoryFormValues) => void;
  initialData: Category | null;
}

export function CategoryForm({ isOpen, setIsOpen, onSubmit, initialData }: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? initialData
      : {
          name: '',
          description: '',
        },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [initialData, form]);

  function handleFormSubmit(data: CategoryFormValues) {
    onSubmit(data);
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            {initialData ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام دسته‌بندی</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: خوراک و پوشاک" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>توضیحات (اختیاری)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="توضیح مختصری در مورد این دسته‌بندی" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>لغو</Button>
                <Button type="submit">ذخیره</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
