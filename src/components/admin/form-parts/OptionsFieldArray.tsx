
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField, FormControl, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Trash2, PlusCircle } from "lucide-react";
import { LessonFormValues } from "../CreateLessonForm";

export const OptionsFieldArray = ({ questionIndex }: { questionIndex: number }) => {
    const { control, getValues, setValue } = useFormContext<LessonFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `questions.${questionIndex}.options`
    });

    return (
        <div className="space-y-2 pl-4">
            <div className="flex justify-between items-center">
                <Label className="text-sm">Options</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ option_text: "", is_correct: false })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Option
                </Button>
            </div>
            {fields.map((item, optionIndex) => (
                <div key={item.id} className="flex items-start space-x-2">
                    <FormField
                        control={control}
                        name={`questions.${questionIndex}.options.${optionIndex}.option_text`}
                        render={({ field }) => (
                            <FormItem className="flex-grow"><FormControl><Input placeholder={`Option ${optionIndex + 1}`} {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`questions.${questionIndex}.options.${optionIndex}.is_correct`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 pt-2">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                // Uncheck all other options when a new one is selected
                                                getValues(`questions.${questionIndex}.options`).forEach((_, i) => {
                                                    setValue(`questions.${questionIndex}.options.${i}.is_correct`, i === optionIndex);
                                                });
                                            }
                                        }}
                                        id={`is-correct-${questionIndex}-${optionIndex}`}
                                    />
                                </FormControl>
                                <Label htmlFor={`is-correct-${questionIndex}-${optionIndex}`} className="text-sm font-normal shrink-0">Correct</Label>
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(optionIndex)} disabled={fields.length <= 2}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
        </div>
    )
}
