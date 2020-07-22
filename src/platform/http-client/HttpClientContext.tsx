import { createContext, useContext } from 'react';
import Cookie from 'universal-cookie';

import { HTTPClient } from './http-client';

export const HTTPClientContext = createContext<HTTPClient>(
  new HTTPClient(new Cookie(), { baseUrl: '' }),
);

export const useHttpClient = (): HTTPClient => useContext(HTTPClientContext);
