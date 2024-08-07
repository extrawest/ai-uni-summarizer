"use client";

import { FormEventHandler, useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [temperture, setTemperture] = useState(0.2);
  const [isFieldVisible, setIsFieldVisible] = useState(true);

  const handleToggleVisibility = () =>
    setIsFieldVisible(prev => !prev);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setGroqApiKey(e.target.value);

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLink(e.target.value);

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post<{
        message: string;
        error?: string;
      }>('/api/generate-summary', { link, groqApiKey, temperture });
      const { message } = response.data;
      setMessage(message);
    } catch (error) {
      console.error(error);
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }

  const onTempertureChange = (value: number[]) => {
    setTemperture(value[0]);
  };

  return (
    <div className='flex min-h-screen flex-col items-center justify-between p-56 bg-gray-800'>
      <form onSubmit={handleFormSubmit}>
        <div className='flex w-full gap-12'>
          <div className='w-1/4'>
            <div className='flex items-end gap-2 w-full'>
              <div className='flex-grow'>
                <Label className='text-white' htmlFor='apiKey'>Your Groq API key</Label>
                <Input
                  disabled={isLoading}
                  type={isFieldVisible ? 'text' : 'password'}
                  id='apiKey'
                  onChange={handleApiKeyChange}
                  value={groqApiKey}
                />
              </div>
              <Button disabled={isLoading} variant="outline" size="icon" onClick={handleToggleVisibility} type='button'>
                {
                  isFieldVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />
                }
              </Button>
            </div>
            <p className='text-white my-4'>You can get your groq api key here: <a className='hover:text-red-500 text-blue-400' href='https://console.groq.com/keys' target='_blank'>GROQ console</a></p>
            <div>
              <div className='flex justify-between mb-3'>
                <Label className='text-white' htmlFor='apiKey'>Temperature</Label>
                <Label className='text-white' htmlFor='apiKey'>{temperture}</Label>
              </div>
              <Slider
                max={1}
                step={0.01}
                value={[temperture]}
                disabled={isLoading}
                onValueChange={onTempertureChange}
              />
            </div>
          </div>
          <div className='w-3/4'>
            <h1 className='text-bold text-4xl text-white'>🦜 🔗 LangChain: Summarize text from Youtube or Website</h1>
            <div className='my-2'>
              <Label className='text-white' htmlFor='link'>Youtube video or Website link</Label>
              <Input
                type='text'
                id='link'
                value={link}
                onChange={handleLinkChange}
                disabled={isLoading}
              />
            </div>
            <Button className='mt-2' type='submit' disabled={isLoading}>Summarize</Button>
            {
              message && <div className='my-4 p-4 bg-gray-800 rounded-lg'>
                {
                  message
                    .split("\n")
                    .map((text, index) =>
                      <p className={`text-white ${index === 0 ? 'text-2xl pb-4' : ''}`} key={index}>
                        {text}
                      </p>
                    )}
              </div>
            }
            {
              isLoading &&
              <div className="flex flex-col space-y-3 mt-5">
                <Skeleton className="h-[35px] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[full]" />
                  <Skeleton className="h-4 w-[full]" />
                </div>
              </div>
            }

            {
              error && <div className='my-4'>
                <p className='text-red-500'>{error}</p>
              </div>
            }
          </div>
        </div>
      </form>
    </div>

  );
}
